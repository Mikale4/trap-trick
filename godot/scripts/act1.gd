extends Node
## The Opening Act: "The Candle". Each part sets its own place, people and hour, so any of them can be started alone.
##   1 dawn at the farm   2 chores (played)   3 the letter   4 leaving   5 Thistlewick (played)   6 the Academy
##   7 Owl House (played)   8 the candle lesson   9 a few bad weeks   10 the bargain   11 the first lesson   12 the night

var s: Node3D
var part := 0
var run_id := 0                       # a newer run stops the older one
var tmp: Array = []
var cart: Node3D
var horse := {}
var cows: Array = []
var bird := {}
var tt_on := false
var tt_in := { "x": 0.0, "z": 0.0, "run": false, "jump": false, "jump_held": false }
var town_lines := {}
var got := false
var fol: Array = []                   # things that follow others: { n, f }
const SAVE := "user://story.json"
const PARTS1 := ["Dawn", "Chores", "The letter", "Leaving home", "Thistlewick", "The Academy", "Owl House", "The candle lesson", "A few bad weeks", "The bargain", "The first lesson", "The night"]
var PARTS: Array = []
var ch1: Node


func _ready() -> void:
	ch1 = preload("res://scripts/ch1.gd").new()
	ch1.s = s
	ch1.a = self
	add_child(ch1)
	PARTS = PARTS1 + ch1.NAMES


func begin(scene: String) -> void:
	if scene == "":
		title()
		return
	if scene.is_valid_int():
		start(int(scene))
		return
	match scene:
		"cast":
			s.go_place("farm")
			s.hour = 9.0
			var i := 0
			for n in s.main.bake.cast.keys():
				if n in ["horse", "cow"]: continue
				var a: Node3D = s.enter(n, Vector3(-7.2 + (i % 12) * 1.25, 0, 3.0 + (i / 12) * 2.0), 0.0)
				a.eyes = ["open", "happy", "wide", "sad", "stern", "half"][i % 6]
				a.mouth = ["flat", "smile", "open", "frown", "grin", "smirk"][i % 6]
				i += 1
			s.mode = "film"
		"farm", "academy":
			s.go_place(scene)
			s.hour = 10.0
			s.mode = "film"
		"school": school(8.0)
		"simday":                                        # dev: a whole school day, everyone kept, to check nobody collides or sticks
			school(7.0)
			s.campus.show_all = true
			s.hero.place(Vector3(0, 0, 40), PI)
		"skip":                                          # dev: the whole act, skipping every scene
			s.set_meta("skip", true)
			start(0)
		"night": _night_test()
		"swing": _swing_test()
		"test": _test()
		"simtown":
			s.go_place("town")
			s.hero = s.enter("reiner", Vector3(0.6, 0, 20), PI)
			s.hour = 11.0
			s.play()
		_: school(float(scene.trim_prefix("school")))


## Dev: Trap Trick walks in at the great door, up the stairs, and into the Proctor's light.
func _night_test() -> void:
	start(20)
	await s.until(func(): return s.tt_mode and s.mode == "play", 60.0)
	var tt: Node3D = s.main.tt
	var press := func(code: int, on: bool) -> void:
		var e := InputEventKey.new()
		e.physical_keycode = code
		e.pressed = on
		Input.parse_input_event(e)
	tt.position = Vector3(0, 0, -3.2)
	press.call(KEY_W, true)
	for k in 4:
		await s.wait(1.5)
		print("walk ", tt.position, " ground ", tt.on_ground, " vane ", s.actor("vane").position)
	tt.position = Vector3(-4.25, FYT, -9.9)
	for k in 6:
		await s.wait(1.2)
		print("stairs ", tt.position, " ", tt.on_ground)
	press.call(KEY_W, false)
	var V: Node3D = s.actor("vane")
	V.path = []
	V.place(Vector3(6, FYT, -7.7), PI / 2)
	ch1.vane.wait = 9.0
	tt.position = Vector3(9.5, FYT, -7.7)
	for k in 8:
		await s.wait(0.4)
		print("seen %.2f  at %s" % [ch1.spotted, tt.position])
	await s.wait(3.0)
	print("after ", tt.position, " visible ", tt.visible, " locked ", s.locked)
	s.get_tree().quit()


const FYT := 0.048


## Dev: the swing's period and height, and whether her hands are on the ropes and she's on the seat.
func _swing_test() -> void:
	start(10)
	await s.wait(3.0)
	var sw: Dictionary = s.stage.swing
	var L: Node3D = s.actor("lotte")
	var last := -1.0
	var was: float = sw.th
	var hi := 0.0
	while s.time < 24.0:
		await s.beat()
		hi = maxf(hi, absf(sw.th))
		if was < 0.0 and sw.th >= 0.0:
			if last > 0.0: print("period %.2f s (small swings of %.2f m: %.2f s)  height %.3f rad" % [s.time - last, sw.len, TAU * sqrt(sw.len / 9.81), hi])
			last = s.time
			hi = 0.0
		was = sw.th
		if fmod(s.time, 1.0) < s.dt_last:
			var seat: Vector3 = sw.n.global_transform * (sw.seat as Vector3)
			var up: Vector3 = sw.n.global_transform.basis.y
			print("  th %+.3f  hands off ropes %.3f %.3f  hips over seat %.3f  body to ropes %.1f deg" % [sw.th, L.hand_pos("L").distance_to((L.reach.L as Node3D).global_position), L.hand_pos("R").distance_to((L.reach.R as Node3D).global_position), (L.P.hips as Node3D).global_position.distance_to(seat), rad_to_deg(L.global_transform.basis.y.angle_to(up))])
	s.get_tree().quit()


## Dev: climb the stairs, use a door, a house, a bed, a lesson, the timetable; report.
func _test() -> void:
	school(9.0)
	await s.wait(0.5)
	var h: Node3D = s.hero
	s.main.shot_mode = "walk"
	h.place(Vector3(-4.25, 0.048, -9.9), PI)
	s.cam_yaw = 0.0
	for k in 7:
		await s.wait(1.2)
		print("stairs ", h.position)
	s.main.shot_mode = ""
	h.place(Vector3(-8.5, 0.048, -8.2), PI)
	await s.wait(0.2)
	print("use: ", s.use_now.label if s.use_now else "none", "  open ", s.stage.doors["1A"].open)
	s.main.shot_mode = "walk"
	await s.wait(1.5)
	print("at the shut door ", h.position)
	s.main.shot_mode = ""
	s.use()
	await s.wait(1.0)
	s.main.shot_mode = "walk"
	await s.wait(1.2)
	print("through it ", h.position, " open ", s.stage.doors["1A"].open)
	s.main.shot_mode = ""
	print("period ", s.campus.period().id, " ", s.campus._label_now())
	await s.campus.attend("1A", "p1")
	print("after the lesson ", s.hour, " ", h.position, " skill ", s.campus.skill, " mode ", s.mode)
	await s.campus._through("owl_door", PI)
	print("in Owl House ", h.position, " y ", s.stage.ground_y(h.position))
	s.hour = 21.5
	await s.wait(0.5)
	await s.campus.sleep(false)
	print("morning ", s.hour, " day ", s.campus.day, " ", h.position)
	s.campus.talk(s.campus.by.wim)
	print("talk ", s.actor("wim").bubble.text)
	for n in ["1A", "2A", "3A", "2B", "library", "refectory", "glass", "yard"]:
		print(n, " seats ", s.stage.data.rooms[n].seats.size(), " path ", s.stage.find_path(s.stage.node_id["owl_door"], s.stage.node_id[s.stage.data.rooms[n].node]).size())
	s.get_tree().quit()


# ------------------------------------------------------------------- menus --
func title() -> void:
	run_id += 1
	s.busy = true
	clean()
	s.paused = false
	s.ui.bars_to = 0.0
	s.ui.clock(false)
	s.ui.objective("")
	s.ui.prompt("")
	s.ui.end_line()
	s.ui.spell_end()
	s.campus.close()
	s.hero = null
	s.go_place("farm")
	s.hour = 18.2
	s.hour_run = 0.0
	s.fader_to = 0.0
	s.mode = "menu"
	s.move(Vector3(20, 5.2, 20), Vector3(0, 3.0, 0), Vector3(-14, 4.2, 24), Vector3(-1, 3.0, -2), 60.0, 44)
	s.main.sound.music("dawn")
	s.main.sound.air("farm")
	s.ui.title("TRAP TRICK", "")
	s.ui.title_l.modulate.a = 1.0
	s.ui.title_l.offset_top = -230
	s.ui.title_l.offset_bottom = -150
	var sv := _saved()
	var items: Array = []
	if sv > 0 and sv < PARTS.size(): items.append(["continue", "Continue:  " + PARTS[sv]])
	items.append(["new", "Opening Act"])
	items.append(["ch1", "Chapter One"])
	items.append(["chapters", "Chapters"])
	items.append(["school", "School Days"])
	items.append(["free", "Roam as Trap Trick"])
	items.append(["quit", "Quit"])
	s.ui.show_menu(items, 0.18)


func menu(id: String) -> void:
	match id:
		"continue": start(_saved())
		"new": start(0)
		"ch1": start(PARTS1.size())
		"chapters":
			s.ui.show_menu([["list0", "The Opening Act"], ["list1", "Chapter One:  The Lantern Board"], ["title", "Back"]], 0.35)
			return
		"list0", "list1":
			var items: Array = []
			var from := 0 if id == "list0" else PARTS1.size()
			var to := PARTS1.size() if id == "list0" else PARTS.size()
			for i in range(from, to): items.append(["part%d" % i, "%d.  %s" % [i - from + 1, PARTS[i]]])
			items.append(["title", "Back"])
			s.ui.show_menu(items, 0.35)
			s.ui.menu_box.offset_top = -190
			return
		"school":
			_shut()
			school(8.0)
		"free":
			_shut()
			s.main.start_free()
		"quit": s.get_tree().quit()
		"resume": s.pause(false)
		"retry":
			s.pause(false)
			if part >= 0: start(part)
			else: school(8.0)
		"title":
			s.pause(false)
			title()
		_: if id.begins_with("part"): start(int(id.substr(4)))
	s.ui.menu_box.offset_top = -10


func _shut() -> void:
	s.ui.hide_menu()
	s.ui.title_l.modulate.a = 0.0
	s.ui.title_l.offset_top = -70
	s.ui.title_l.offset_bottom = 10
	run_id += 1
	s.paused = false


func _saved() -> int:
	if not FileAccess.file_exists(SAVE): return 0
	var d = JSON.parse_string(FileAccess.get_file_as_string(SAVE))
	return int(d.get("part", 0)) if d is Dictionary else 0


func _save(i: int) -> void:
	if s.main.shot_path != "" or s.main.film_dir != "": return
	var f := FileAccess.open(SAVE, FileAccess.WRITE)
	if f: f.store_string(JSON.stringify({ "part": i }))


## Play from a part on.
func start(i: int) -> void:
	_shut()
	var id := run_id
	s.busy = true
	s.campus.close()
	s.skipping = false
	s.ui.spell_end()
	s.ui.end_line()
	s.fader = 1.0
	s.fader_to = 1.0
	s.fader_c = Color.BLACK
	var list: Array = [p1_dawn, p2_chores, p3_letter, p4_leaving, p5_town, p6_academy, p7_owl, p8_lesson, p9_weeks, p10_bargain, p11_first, p12_night]
	list.append_array(ch1.list())
	for k in range(i, list.size()):
		part = k
		_save(k)
		if s.main.dev_auto: print("part %d %s  t=%.1f" % [k, PARTS[k], s.time])
		clean()
		s.locked = false
		s.sitting = null
		await (list[k] as Callable).call()
		if id != run_id: return
		s.skipping = false
	_save(0)
	school(8.0)
	ch1.levelled = true                                # (after Chapter One the lanterns hang level)


## The school, free to roam.
func school(h: float) -> void:
	part = -1
	clean()
	s.campus.close()
	s.go_place("academy")
	s.campus.chapter = 1
	s.hero = s.enter("reiner_uni", Vector3(0, 0, 22), PI)
	s.campus.open(h)
	ch1.board(24, true)
	s.main.sound.music("school")
	s.main.sound.air("school")
	s.busy = false
	s.fader_to = 0.0
	s.fader_s = 1.0
	s.play()
	s.ui.place("The Mage Academy")
	s.ui.toast("School days. T shows the timetable. The bell tells you when.")


func clean() -> void:
	for n in tmp: if is_instance_valid(n): n.queue_free()
	tmp = []
	fol = []
	for f in s.flames.duplicate(): s.kill_flame(f.n)
	cart = null
	horse = {}
	cows = []
	bird = {}
	if tt_on:
		tt_on = false
		s.main.tt.visible = false
		s.main.fx.visible = false
	s.uses = []
	s.goal = null
	s.tt_mode = false
	s.ui.watch(0.0)
	s.campus.chapter = 0 if part < PARTS1.size() else 1
	ch1.reset()


## Two people put their arms round each other (the only time anyone comes this close), and step apart again.
func _embrace(a: Node3D, b: Node3D, secs: float) -> void:
	a.turn_to(b)
	b.turn_to(a)
	var d: Vector3 = b.position - a.position
	d.y = 0.0
	var p0: Vector3 = a.position
	var to: Vector3 = b.position - d.normalized() * 0.42
	a.set_meta("close", true)
	b.set_meta("close", true)
	a.do("hug", secs)
	b.do("hug", secs)
	var t0: float = s.time
	while s.time < t0 + secs:
		var u: float = (s.time - t0) / secs
		a.position = p0.lerp(to, smoothstep(0.0, 0.22, u) * (1.0 - smoothstep(0.78, 1.0, u)))
		await s.beat()
	a.position = p0
	a.remove_meta("close")
	b.remove_meta("close")


func keep(n: Node3D) -> Node3D:
	tmp.append(n)
	return n


func live(id: int) -> bool: return id == run_id


# ------------------------------------------------------------------ beasts --
func _beast(kind: String, p: Vector3, yaw: float) -> Dictionary:
	var rig: Node3D = (s.cast_src.find_child(kind, true, false) as Node3D).duplicate()
	s.add_child(rig)
	rig.visible = true
	rig.position = p
	rig.rotation.y = yaw
	keep(rig)
	var b := { "n": rig, "P": {}, "sp": 0.0, "ph": randf() * TAU, "t": randf() * 9.0, "kind": kind, "graze": 0.0 }
	for q in s.main.bake.cast[kind].parts: b.P[q] = rig.find_child("%s_%s" % [kind, q], true, false)
	return b


func _beast_update(b: Dictionary, dt: float) -> void:
	b.t += dt
	b.ph += dt * b.sp * 3.6
	var k: float = clampf(b.sp / 1.4, 0.0, 1.0)
	var off := { "FL": 0.0, "BR": 0.6, "FR": PI, "BL": PI + 0.6 }
	for l in off:
		var up: Node3D = b.P.get("up" + l)
		if up == null: continue
		var a := sin(b.ph + off[l])
		up.rotation.x = -a * 0.42 * k
		var lo: Node3D = b.P.get("lo" + l)
		if lo: lo.rotation.x = maxf(0.0, cos(b.ph + off[l])) * 0.8 * k
	(b.P.body as Node3D).position.y = (b.P.body as Node3D).get_parent().position.y * 0.0 + absf(sin(b.ph)) * 0.02 * k
	if b.P.has("neck"): (b.P.neck as Node3D).rotation.x = sin(b.ph * 2.0) * 0.05 * k + sin(b.t * 0.7) * 0.03 * (1.0 - k)
	if b.kind == "cow": b.graze = lerpf(b.graze, 1.0 if fmod(b.t, 14.0) < 9.0 else 0.0, dt * 1.5)
	(b.P.head as Node3D).rotation.x = b.graze * 0.9 + sin(b.t * (2.6 if b.graze > 0.5 else 0.6)) * 0.05
	(b.P.tail as Node3D).rotation.z = sin(b.t * 1.9) * 0.22
	(b.P.tail as Node3D).rotation.x = -0.1 * k


func _cart(p: Vector3, yaw: float) -> void:
	cart = Node3D.new()
	s.add_child(cart)
	keep(cart)
	cart.position = p
	cart.rotation.y = yaw
	var b: Node3D = s.prop("cart_body")
	cart.add_child(b)
	b.position.y = 0.72
	for sd in [-1, 1]:
		var wh: Node3D = s.prop("cart_rim")
		cart.add_child(wh)
		wh.name = "wheel%d" % (sd + 1)
		wh.position = Vector3(sd * 0.56, 0.72, 0)
	horse = _beast("horse", Vector3.ZERO, 0)
	s.remove_child(horse.n)
	cart.add_child(horse.n)
	horse.n.position = Vector3(0, 0, 2.25)
	cart.set_meta("v", 0.0)
	cart.set_meta("turn", 0.0)


func _cart_update(dt: float) -> void:
	var v: float = cart.get_meta("v")
	horse.sp = v
	if v > 0.01:
		var z := cart.position.z + cos(cart.rotation.y) * v * dt
		if s.place == "farm":
			var rx := func(zz: float) -> float: return 0.5 + (sin((zz - 20.0) * 0.05) * 3.0 * minf(1.0, (zz - 20.0) / 20.0) if zz > 20.0 else 0.0)
			cart.position.z += v * dt
			cart.position.x = rx.call(cart.position.z)
			cart.rotation.y = atan2(rx.call(cart.position.z + 0.5) - cart.position.x, 0.5)
		else: cart.position += Vector3(sin(cart.rotation.y), 0, cos(cart.rotation.y)) * v * dt
	cart.set_meta("turn", cart.get_meta("turn") + v * dt / 0.72)
	for c in cart.get_children(): if String(c.name).begins_with("wheel"): c.rotation.x = cart.get_meta("turn")
	for n in ["reiner", "father"]:
		var a: Node3D = s.actors.get(n)
		if a and a.visible and a.has_meta("cart"):
			a.position = cart.position + Basis(Vector3.UP, cart.rotation.y) * (a.get_meta("cart") as Vector3) + Vector3(0, sin(s.time * 9.0) * 0.008 * minf(1.0, v), 0)
			a.yaw = cart.rotation.y
			a.prev_pos = a.position


func _board(n: String, x: float) -> void:
	var a: Node3D = s.actors[n]
	a.set_meta("cart", Vector3(x, 0, 0.44))
	a.path = []
	a.sit(1.27, "drive" if n == "father" else "sit")


func _off_cart() -> void:
	for n in ["reiner", "father"]: if s.actors.has(n) and s.actors[n].has_meta("cart"): s.actors[n].remove_meta("cart")


# -------------------------------------------------------------- paper bird --
func _bird(p: Vector3) -> void:
	var n := Node3D.new()
	s.add_child(n)
	keep(n)
	n.position = p
	n.add_child(s.prop("bird_body"))
	var L: Node3D = s.prop("bird_wing")
	var R: Node3D = s.prop("bird_wing")
	n.add_child(L)
	n.add_child(R)
	R.rotation.y = PI
	var rr := Node3D.new()
	bird = { "n": n, "L": L, "R": R, "t": 0.0, "flap": 9.0, "pts": [], "u": 0.0, "d": 1.0, "glow": 0.0 }
	rr.free()


func _bird_update(dt: float) -> void:
	bird.t += dt
	var a := sin(bird.t * bird.flap) * 0.75
	(bird.L as Node3D).rotation = Vector3(0, 0, a)
	(bird.R as Node3D).rotation = Vector3(0, PI, a)
	if bird.pts.size() >= 2:
		bird.u = minf(1.0, bird.u + dt / bird.d)
		var m: float = smoothstep(0.0, 1.0, bird.u) * (bird.pts.size() - 1)
		var i := mini(int(m), bird.pts.size() - 2)
		var f := m - i
		var p0: Vector3 = bird.pts[maxi(0, i - 1)]
		var p1: Vector3 = bird.pts[i]
		var p2: Vector3 = bird.pts[i + 1]
		var p3: Vector3 = bird.pts[mini(bird.pts.size() - 1, i + 2)]
		var np := p1.cubic_interpolate(p2, p0, p3, f)
		var d: Vector3 = np - bird.n.position
		if Vector2(d.x, d.z).length() > 0.002: bird.n.rotation.y = lerp_angle(bird.n.rotation.y, atan2(d.x, d.z), 1.0 - exp(-8.0 * dt))
		bird.n.position = np + Vector3(0, sin(bird.t * 4.0) * 0.02, 0)


func fly(pts: Array, d: float) -> void:
	bird.pts = pts
	bird.u = 0.0
	bird.d = d


# ------------------------------------------------------------------- frame --
func update(dt: float) -> void:
	if s.has_meta("skip") and s.mode == "film": s.skipping = true
	if cart and is_instance_valid(cart): _cart_update(dt)
	if not horse.is_empty() and is_instance_valid(horse.n): _beast_update(horse, dt)
	for c in cows: if is_instance_valid(c.n): _beast_update(c, dt)
	if not bird.is_empty() and is_instance_valid(bird.n): _bird_update(dt)
	for f in fol: if is_instance_valid(f.n): f.f.call(f.n, dt)
	if tt_on:
		s.main.tt.update(dt, tt_in)
		s.main.fx.visible = true
	ch1.update(dt)


func _farm(h: float) -> void:
	s.go_place("farm")
	s.hour = h
	s.hour_run = 0.0
	s.main.sound.air("farm")
	cows = [_beast("cow", Vector3(-19.6, 0, 7.2), 2.2), _beast("cow", Vector3(-21.6, 0, 9.4), 0.6)]


## Wait for the player to come to a place.
func reach(p: Vector3, r: float) -> void:
	s.goal = p
	var t0: float = s.time
	var id := run_id
	while live(id) and Vector2(s.hero.position.x - p.x, s.hero.position.z - p.z).length() > r or absf(s.hero.position.y - p.y) > 1.5:
		if s.main.dev_auto and s.time > t0 + 1.2: s.hero.place(p, s.hero.yaw)
		await s.beat()
		if not live(id): return
	s.goal = null


## Wait for the player to use something.
func use(p: Vector3, label: String, r := 1.3) -> void:
	got = false
	var u := { "pos": p, "r": r, "label": label, "f": func(): got = true, "first": true }
	s.uses.append(u)
	s.goal = p
	var t0: float = s.time
	var id := run_id
	while not got and live(id):
		if s.main.dev_auto and s.time > t0 + 1.2:
			s.hero.place(p + Vector3(0.6, 0, 0.3), s.hero.yaw)
			got = true
		await s.beat()
	s.uses.erase(u)
	s.goal = null


# ==================================================================== 1 == --
func p1_dawn() -> void:
	_farm(6.45)
	s.film()
	s.main.sound.music("dawn")
	var R: Node3D = s.enter("reiner", Vector3(13.75, 0, 8), PI / 2)
	var L: Node3D = s.enter("lotte", Vector3(14.82, 0, 5.2), -PI / 2)
	s.hero = R
	L.sit(0.88, "sitedge")
	L.look = R
	L.feel("open", "smile")
	var C: Node3D = keep(s.put("candle", Vector3(15, 1.1, 8)))
	s.move(Vector3(38, 9, 26), Vector3(6, 3, 2), Vector3(26, 5.0, 17), Vector3(2, 2.2, 0), 10.0, 42)
	await s.fade(0.0, 2.4)
	s.main.sfx("rooster")
	await s.wait(0.8)
	await s.title_card("TRAP TRICK", "The Opening Act", 4.4)
	s.move(Vector3(-16.5, 1.3, 18.5), Vector3(-11, 0.7, 12), Vector3(-14.5, 0.9, 17.2), Vector3(-10.6, 0.5, 12.4), 4.2, 40)
	await s.wait(3.4)
	# the candle on the fence post
	R.look = C
	var book: Node3D = s.prop("book_open")
	R.hold("L", book, Transform3D(Basis(Vector3.RIGHT, 0.5) * Basis(Vector3.UP, PI), Vector3(0, -0.04, 0.08)))
	s.move(Vector3(15.9, 1.25, 7.5), Vector3(15, 1.2, 8), Vector3(15.5, 1.3, 7.6), Vector3(14.4, 1.35, 8), 3.6, 34)
	await s.wait(2.2)
	s.move(Vector3(15.5, 1.25, 9.1), Vector3(13.9, 1.3, 8), Vector3(15.2, 1.3, 8.8), Vector3(13.9, 1.32, 8), 5.0, 38)
	R.feel("stern", "flat")
	await s.say("reiner", "Wake, small one...")
	R.do("castdo", 1.5)
	await s.say("reiner", "...and see!", { "after": 0.0 })
	s.runes(Vector3(14.55, 1.35, 8), PI / 2, Color("ffcf6a"), 1.2, 0.2)
	await s.wait(0.35)
	s.main.sfx("fizz")
	s.smoke(C.position + Vector3(0, 0.28, 0), 5, false)
	await s.wait(0.9)
	# it falls off
	s.cut(Vector3(15.6, 1.2, 8.9), Vector3(15, 1.1, 8), 30)
	var t0: float = s.time
	while s.time < t0 + 0.9:
		C.rotation.x = sin((s.time - t0) * 12.0) * 0.12
		await s.beat()
	t0 = s.time
	while s.time < t0 + 0.55:
		var u: float = (s.time - t0) / 0.55
		C.position = Vector3(15.0 - u * 0.25, 1.1 - u * u * 1.08, 8.0 + u * 0.1)
		C.rotation = Vector3(u * 2.0, 0, u * 1.5)
		await s.beat()
	C.rotation = Vector3(0, 0, PI / 2)
	C.position.y = 0.1
	s.main.sfx("clunk")
	R.look = C
	await s.wait(0.5)
	s.face(L, 0.35, 1.7, 36)
	await s.say("lotte", "It moved!", { "eyes": "wide", "mouth": "grin", "do": "clap" })
	s.face(R, -0.5, 1.5, 36)
	R.look = L
	await s.say("reiner", "It fell over, Lotte.", { "eyes": "half", "mouth": "frown", "do": "sigh" })
	s.two(R, L, 1.0, 3.4, 40, 0.2)
	await s.say("lotte", "It fell over magically.", { "eyes": "happy", "mouth": "smile" })
	R.drop("L").queue_free()
	R.do("pickup", 1.6)
	await s.wait(0.8)
	C.visible = false
	await s.wait(0.6)
	s.over(L, R, -1.0, 38)
	R.turn_to(L)
	R.look = L
	await s.say("reiner", "Two years I've asked it. It's never so much as smoked.", { "eyes": "sad", "mouth": "frown" })
	s.over(R, L, 1.0, 36)
	await s.say("lotte", "It smoked on my birthday.", { "eyes": "open", "mouth": "flat", "do": "tilt" })
	s.face(R, 0.4, 1.4, 34)
	await s.say("reiner", "That was the cake.", { "eyes": "half", "mouth": "wavy" })
	s.cut(Vector3(9, 1.6, 12.5), Vector3(14, 1.2, 6.8), 42)
	R.look = Vector3(-7, 1.5, -4)
	L.look = Vector3(-7, 1.5, -4)
	await s.say("mother", "Reiner! Those hens won't feed themselves!", { "as": "Mother, from the house" })
	R.do("flinch", 0.9)
	R.feel("wide", "oh", 1.0)
	await s.wait(0.7)
	L.do("giggle", 1.6)
	await s.say("lotte", "Wake, small one. And see the hens.", { "eyes": "happy", "mouth": "grin" })
	await s.fade(1.0, 0.7)


# ==================================================================== 2 == --
func p2_chores() -> void:
	_farm(7.0)
	s.main.sound.music("dawn")
	s.hero = s.enter("reiner", Vector3(9.5, 0, 7), -PI / 2)
	var R: Node3D = s.hero
	var L: Node3D = s.enter("lotte", Vector3(6.0, 0, 9.6), 0.6)
	L.pose = "stand"
	L.look = R
	s.play()
	await s.fade(0.0, 0.8)
	s.ui.place("The farm past the third milestone")
	s.uses.append({ "pos": L, "r": 1.5, "label": "Talk to Lotte", "f": func(): _lotte_chat(L) })
	s.ui.objective("Feed the hens, west of the yard")
	s.ui.toast("W A S D walk   ·   Shift run   ·   drag to look   ·   E use")
	var id := run_id
	await use(Vector3(-10.6, 0, 12.3), "Scatter the grain", 1.9)
	if not live(id): return
	# grain
	s.locked = true
	R.face_yaw = R.yaw
	R.do("scatter", 1.1)
	await s.wait(0.45)
	for k in 3:
		s.burst(R.position + Vector3(sin(R.yaw) * 0.5, 0.95, cos(R.yaw) * 0.5), Color("f0d070"), Color("d0a040"), 14, 1.2, -6.0, 0.02, 0.7, 60.0)
		s.main.sfx("grain")
		await s.wait(0.25)
	s.stage.feed_hens(R.position + Vector3(sin(R.yaw) * 1.1, 0, cos(R.yaw) * 1.1))
	s.main.sfx("cluck")
	await s.wait(1.2)
	R.feel("happy", "smile", 2.0)
	await s.say("reiner", "There. At least somebody wakes when I ask.", { "auto": true })
	s.locked = false
	s.ui.objective("Draw water at the well")
	await use(Vector3(4.2, 0, 0.4), "Draw water", 1.7)
	if not live(id): return
	s.locked = true
	R.turn_to(Vector3(4.2, 0, 0.4))
	s.main.sfx("well")
	for k in 3:
		R.do("pickup", 0.9)
		await s.wait(0.85)
	R.hold("R", s.prop("pail"), Transform3D(Basis(), Vector3(0, -0.46, 0.02)))
	s.main.sfx("splash")
	s.locked = false
	R.face_yaw = null
	s.ui.objective("Fill the trough by the barn")
	await use(Vector3(8.2, 0, -2.6), "Fill the trough", 1.6)
	if not live(id): return
	s.locked = true
	R.turn_to(Vector3(8.2, 0, -2.6))
	R.do("offer2", 1.5)
	await s.wait(0.5)
	s.main.sfx("splash")
	s.burst(Vector3(8.2, 0.62, -2.6), Color("8cc8f0"), Color("d0ecff"), 22, 1.6, -6.0, 0.03, 0.7, 70.0)
	await s.wait(0.8)
	var pl: Node3D = R.drop("R")
	if pl: pl.queue_free()
	R.do("stretch", 1.6)
	await s.wait(1.2)
	await s.say("lotte", "REINER! There's a bird! It's made of PAPER!", { "as": "Lotte, from the gate", "auto": true })
	s.locked = false


func _lotte_chat(L: Node3D) -> void:
	if L.bubble: return
	var i: int = L.get_meta("li", 0)
	L.set_meta("li", i + 1)
	L.turn_to(s.hero)
	L.say_bubble(["If you were a real mage, would you still feed the hens?", "Duchess laid two. One for you. Not the big one.", "Da says the Academy has a bell you can see.", "Mam's got buns in. I'm not telling you. I'm just saying it near you."][i % 4], s.campus.font)
	L.feel("happy", "smile", 3.0)


# ==================================================================== 3 == --
func p3_letter() -> void:
	_farm(7.8)
	s.film()
	s.main.sound.music("letter")
	var R: Node3D = s.enter("reiner", Vector3(3.2, 0, 4.6), 0.0)
	s.hero = R
	var L: Node3D = s.enter("lotte", Vector3(0.6, 0, 13.0), PI)
	var M: Node3D = s.enter("mother", Vector3(-6.6, 0, -4.0), 0.4)
	var F: Node3D = s.enter("father", Vector3(11.2, 0, -2.6), -0.6)
	_bird(Vector3(0.5, 3.2, 40))
	R.look = bird.n
	L.look = bird.n
	fly([Vector3(0.6, 3.0, 42), Vector3(1.4, 2.4, 30), Vector3(0.2, 2.8, 20), Vector3(-2.5, 3.4, 10), Vector3(-8, 4.6, 2), Vector3(-9, 6.5, -6), Vector3(-2, 6.4, -9), Vector3(5, 4.2, -2), Vector3(7, 3.0, 4), Vector3(5.2, 2.2, 8.4), Vector3(3.2, 1.75, 6.3)], 13.5)
	s.cut(Vector3(1.8, 1.6, 47), Vector3(0.5, 2.6, 30), 40)
	s.shot.p1 = Vector3(1.4, 1.5, 30)
	s.shot.l1 = Vector3(0.0, 2.4, 12)
	s.shot.d = 4.2
	s.main.sfx("flutter")
	await s.fade(0.0, 0.8)
	await s.wait(1.4)
	L.go_free([Vector3(0.6, 0, 10), Vector3(-2, 0, 6), Vector3(-3, 0, 1), Vector3(1, 0, 0), Vector3(5, 0, 2.2), Vector3(5.0, 0, 5.4)], 3.4)
	L.feel("wide", "grin")
	s.cut(Vector3(8, 1.4, 12), Vector3(-2, 2.6, 6), 46)
	s.shot.l1 = Vector3(-7, 4.0, -4)
	s.shot.d = 2.4
	await s.say("lotte", "It's lost! It's going round the house!", { "after": 0.0 })
	s.cut(Vector3(-1.5, 1.2, 9.5), Vector3(-6, 5.6, -7), 46)
	s.shot.l1 = Vector3(4, 3.8, -2)
	s.shot.d = 2.6
	await s.until(func(): return bird.u > 0.8, 8.0)
	s.cut(Vector3(1.4, 1.35, 7.2), Vector3(3.4, 1.5, 4.8), 38)
	await s.until(func(): return bird.u >= 1.0, 8.0)
	R.feel("wide", "oh")
	R.face_yaw = 0.0
	s.main.sfx("chime")
	await s.wait(0.5)
	R.reach.R = Vector3(3.1, 1.32, 5.25)
	R.hand.R = "open"
	s.face(R, 0.3, 1.7, 36)
	await s.wait(0.6)
	fly([bird.n.position, Vector3(3.15, 1.7, 5.8), Vector3(3.08, 1.42, 5.24)], 1.4)
	await s.wait(1.5)
	bird.flap = 2.0
	s.cut(Vector3(3.9, 1.6, 6.1), Vector3(3.1, 1.4, 5.1), 30)
	L.face_yaw = atan2(-1.8, -0.8)
	L.look = bird.n
	await s.say("lotte", "It's got your name on its wing.", { "as": "Lotte", "eyes": "wide" })
	# it unfolds
	s.main.sfx("paper")
	var t0: float = s.time
	while s.time < t0 + 0.8:
		bird.n.scale = Vector3.ONE * (1.0 - (s.time - t0) * 0.7)
		bird.n.rotation.y += 0.22
		await s.beat()
	s.sparkle(bird.n.position, 24)
	bird.n.visible = false
	R.reach.R = null
	R.hand.R = ""
	R.pose = "letter"
	var let: Node3D = s.prop("letter")
	R.hold("R", let, Transform3D(Basis(Vector3.RIGHT, -1.2) * Basis(Vector3.UP, 0.0), Vector3(0.13, -0.02, 0.12)))
	M.go_free([Vector3(-3, 0, 0.4), Vector3(1.4, 0, 4.6)], 1.7)
	F.go_free([Vector3(8, 0, 1.6), Vector3(5.2, 0, 4.0)], 1.8)
	await s.wait(0.9)
	s.face(R, -0.35, 1.5, 34)
	R.feel("open", "flat")
	R.look = null
	await s.say("reiner", "\"To Reiner, of the farm past the third milestone. The Mage Academy at Thistlewick is pleased to...\"")
	R.feel("wide", "flat")
	await s.wait(0.5)
	M.face_yaw = atan2(R.position.x - M.position.x, R.position.z - M.position.z)
	F.turn_to(R)
	M.look = R
	F.look = R
	L.look = R
	s.cut(Vector3(3.6, 1.7, 9.4), Vector3(3.2, 1.1, 4.4), 42)
	await s.say("reiner", "There's been a mistake.", { "eyes": "worry", "mouth": "wavy" })
	M.turn_to(R)
	s.face(F, -0.4, 1.6, 34)
	await s.say("father", "Read it again.", { "eyes": "open", "mouth": "flat" })
	s.over(F, R, 1.0, 36)
	await s.say("reiner", "\"...pleased to accept you as a pupil of the first year. Bring stout boots.\"")
	s.face(M, 0.4, 1.4, 34)
	M.feel("wide", "oh")
	M.do("mouthcover", 2.2)
	await s.wait(1.3)
	await s.say("mother", "Oh, Reiner.", { "eyes": "sad", "mouth": "smile" })
	s.cut(Vector3(6.6, 1.5, 9.0), Vector3(3.2, 1.0, 4.8), 42)
	M.go_free([Vector3(2.45, 0, 4.3)], 1.6)
	await s.wait(0.8)
	M.turn_to(R)
	_embrace(M, R, 3.0)
	L.go_free([Vector3(6.6, 0, 6.5), Vector3(4, 0, 8.2), Vector3(0.5, 0, 7.0), Vector3(0.2, 0, 3.4), Vector3(3, 0, 1.8), Vector3(6.2, 0, 3.4), Vector3(6.2, 0, 6.2), Vector3(4.2, 0, 7.0)], 3.6)
	L.feel("happy", "shout")
	await s.say("lotte", "My brother's a MAGE! My brother's a MAAAGE!", { "eyes": "happy", "mouth": "shout" })
	await s.wait(1.2)
	M.pose = "stand"
	M.feel("soft", "smile")
	M.go_free([Vector3(1.9, 0, 4.1)], 1.2)
	var old: Node3D = R.drop("R")
	if old: old.queue_free()
	R.pose = "stand"
	s.face(R, 0.5, 1.5, 34)
	R.look = F
	await s.say("reiner", "I failed the test, Da. Everyone's candle lit. I asked mine and it just... stood there. So I walked home.", { "eyes": "sad", "mouth": "frown" })
	s.over(R, F, -1.0, 34)
	F.do("nod", 1.6)
	await s.wait(0.9)
	await s.say("father", "Then somebody there saw you ask.", { "eyes": "soft", "mouth": "smile" })
	M.face_yaw = atan2(F.position.x - M.position.x, F.position.z - M.position.z)
	s.two(F, M, -1.0, 3.2, 38, 0.1)
	F.look = M
	M.look = F
	await s.say("father", "Two crowns a term, it says here at the bottom. That's the brown cow and a bit.", { "eyes": "worry", "do": "scratch" })
	s.face(M, -0.3, 1.5, 34)
	await s.say("mother", "Then it's the brown cow and a bit.", { "eyes": "soft", "mouth": "smile" })
	s.move(Vector3(4.6, 1.9, 8.2), Vector3(3.2, 1.2, 4.6), Vector3(7, 5.6, 16), Vector3(1, 1.6, 2), 6.0, 38)
	R.look = Vector3(0.5, 3, 60)
	R.face_yaw = 0.0
	L.go_free([Vector3(4.0, 0, 5.4)], 2.0)
	await s.wait(3.6)
	await s.fade(1.0, 1.4)


# ==================================================================== 4 == --
func p4_leaving() -> void:
	_farm(6.7)
	s.film()
	s.main.sound.music("road")
	_cart(Vector3(0.5, 0, 6.2), 0.0)
	var R: Node3D = s.enter("reiner", Vector3(2.6, 0, 5.2), -PI / 2)
	var M: Node3D = s.enter("mother", Vector3(1.75, 0, 5.2), PI / 2)
	var L: Node3D = s.enter("lotte", Vector3(3.2, 0, 3.6), -0.4)
	var F: Node3D = s.enter("father", Vector3(-0.6, 0, 8.4), 0.6)
	s.hero = R
	F.look = horse.n
	F.reach.R = Vector3(0.3, 1.4, 8.7)
	var tk: Node3D = s.prop("trunk")
	cart.add_child(tk)
	tk.position = Vector3(0, 0.92, -0.35)
	s.move(Vector3(9, 2.6, 13.5), Vector3(1, 1.2, 5.6), Vector3(6.6, 1.9, 10.5), Vector3(1.4, 1.2, 5.4), 5.0, 40)
	await s.fade(0.0, 1.0)
	s.ui.place("Three mornings later")
	await s.wait(2.4)
	M.look = R
	R.look = M
	M.reach.R = R.head_pos() + Vector3(-0.1, -0.27, 0.06)
	M.reach.L = R.head_pos() + Vector3(-0.1, -0.27, -0.06)
	s.two(M, R, 1.0, 1.9, 36, 0.06)
	await s.say("mother", "Eat. Write. Wear the scarf.", { "eyes": "worry", "mouth": "smile" })
	await s.say("reiner", "It's spring, Mam.", { "eyes": "half", "mouth": "smile" })
	await s.say("mother", "Wear it anyway.", { "eyes": "soft", "mouth": "smile" })
	M.reach.R = null
	M.reach.L = null
	var bd: Node3D = s.prop("bundle")
	M.hold("R", bd, Transform3D(Basis(), Vector3(0.12, -0.16, 0.1)))
	M.do("offer2", 2.2)
	await s.wait(0.8)
	var b2: Node3D = M.drop("R")
	R.hold("L", b2, Transform3D(Basis(), Vector3(0, -0.16, 0.1)))
	R.do("nod", 1.0)
	await s.say("mother", "Honey buns. The bottom ones are for sharing. Make a friend with them.")
	_embrace(R, M, 1.7)
	s.cut(Vector3(0.6, 1.5, 3.2), Vector3(2.2, 1.3, 5.2), 34)
	await s.wait(1.7)
	# Lotte's hen
	L.go_free([Vector3(2.75, 0, 4.15)], 1.4)
	await s.wait(0.9)
	R.turn_to(L)
	L.turn_to(R)
	R.pose = "kneel"
	R.look = L
	L.look = R
	s.cut(Vector3(1.0, 1.05, 3.6), Vector3(2.7, 0.95, 4.7), 34)
	await s.wait(0.7)
	var hen: Node3D = s.prop("toyhen")
	L.hold("R", hen, Transform3D(Basis(), Vector3(0, -0.1, 0.04)))
	L.do("offer", 4.0)
	await s.say("lotte", "This is Duchess. She's brave. So you needn't be, all the time.", { "eyes": "worry", "mouth": "flat" })
	R.reach.R = L.hand_pos("R")
	await s.wait(0.6)
	var h2: Node3D = L.drop("R")
	R.hold("R", h2, Transform3D(Basis(), Vector3(0, -0.1, 0.04)))
	R.reach.R = null
	s.face(R, 0.35, 1.3, 34)
	await s.say("reiner", "I'll bring her home.", { "eyes": "soft", "mouth": "smile" })
	s.face(L, -0.35, 1.2, 34)
	await s.say("lotte", "Bring her home magic.", { "eyes": "open", "mouth": "grin" })
	s.cut(Vector3(0.6, 1.4, 2.8), Vector3(2.7, 1.0, 4.6), 36)
	R.do("ruffle", 1.2)
	L.feel("happy", "smile", 2.0)
	await s.wait(1.2)
	for sd in ["L", "R"]:
		var n: Node3D = R.drop(sd)
		if n: n.queue_free()
	await s.fade(1.0, 0.5)
	# up, and off
	R.get_up()
	F.reach.R = null
	_board("father", -0.29)
	_board("reiner", 0.29)
	M.place(Vector3(3.0, 0, 5.8), -0.9)
	L.place(Vector3(3.2, 0, 7.0), -0.9)
	s.cut(Vector3(5.6, 1.5, 10.8), Vector3(0.8, 1.4, 6.8), 40)
	await s.fade(0.0, 0.5)
	await s.say("father", "Walk on.", { "do": "nod" })
	s.main.sfx("hooves")
	var v := 0.0
	R.look = M
	M.do("wave", 4.0)
	M.look = R
	L.look = R
	var t0: float = s.time
	while s.time < t0 + 1.6:
		v = move_toward(v, 1.5, s.dt_last * 1.2)
		cart.set_meta("v", v)
		await s.beat()
	L.go_free([Vector3(1.2, 0, 9.4), Vector3(0.6, 0, 12.6)], 3.3)
	L.feel("happy", "shout")
	s.cut(Vector3(-4.6, 1.2, 17.4), Vector3(0.8, 1.2, 11), 42)
	s.shot.l1 = Vector3(0.4, 1.4, 17)
	s.shot.d = 5.0
	await s.say("lotte", "GOODBYE, DUCHESS!", { "eyes": "happy", "mouth": "shout", "after": 0.0 })
	L.do("wavebig", 5.0)
	R.look = L
	R.do("wave", 2.6)
	R.feel("soft", "smile")
	await s.say("reiner", "She says goodbye!", { "mouth": "grin", "after": 0.4 })
	s.move(Vector3(3.6, 2.2, 4.2), Vector3(0.8, 1.2, 16), Vector3(2.6, 3.4, 8.4), Vector3(0.4, 1.0, 34), 7.0, 38)
	await s.wait(3.6)
	M.do("", 0.1)
	M.feel("sad", "smile")
	await s.fade(1.0, 0.7)
	# on the road
	cart.position = Vector3(0.5, 0, 24)
	cart.set_meta("v", 1.15)
	s.hour = 8.4
	R.look = null
	R.feel("down", "flat")
	F.look = null
	s.ride(cart, Vector3(3.3, 1.9, 3.4), Vector3(0, 1.75, 0.8), 36)
	await s.fade(0.0, 0.7)
	await s.wait(3.0)
	s.ride(cart, Vector3(1.5, 1.95, 2.0), Vector3(0.1, 1.85, 0.45), 32)
	await s.say("reiner", "What if I can't do it?", { "eyes": "worry", "mouth": "frown" })
	s.ride(cart, Vector3(-1.5, 2.0, 1.9), Vector3(-0.1, 1.9, 0.45), 32)
	F.do("nod", 1.2)
	await s.wait(1.0)
	await s.say("father", "Then you'll know the way home.", { "eyes": "soft", "mouth": "flat" })
	s.ride(cart, Vector3(0.9, 2.0, 2.4), Vector3(0, 1.85, 0.4), 34)
	R.look = F
	F.look = R
	await s.say("father", "But you'll go in at the door first. That's all I ask. Go in at the door.", { "eyes": "open", "mouth": "smile" })
	R.feel("soft", "smile")
	R.do("nod", 1.2)
	await s.wait(0.8)
	s.move(cart.position + Vector3(6, 5, -9), cart.position + Vector3(0, 1, 4), cart.position + Vector3(9, 9, -12), cart.position + Vector3(0, 1, 26), 6.0, 40)
	await s.wait(4.2)
	await s.fade(1.0, 1.2)
	_off_cart()
	R.get_up()
	F.get_up()


# ==================================================================== 5 == --
const TOWN_SAY := { "Honey": 0 }


func _town_story(on: bool) -> void:
	# the townsfolk speak to a boy with a bundle, not to a magician
	var T: Node3D = s.main.town
	if on and town_lines.is_empty():
		for n in T.npcs: town_lines[n.root] = n.spec.lines
		var swaps := { "That colour suits you, miss.": "That coat's seen a barn or two, lad.", "A posy for the pretty magician?": "A posy for your mother, lad? She'll have earned it.", "Do a card trick! Do a card trick!": "There's a lady who does card tricks! She's not here today!", "Are you a real magician?": "Are you going to the Academy? Are you going to EXPLODE?", "Keep out of trouble, traveller.": "Academy's up past the lookout, east street. You've the look.", "The gate closes at dusk.": "Farm cart? Mind it clear of the chickens." }
		for n in T.npcs:
			var l: Array = []
			for q in n.spec.lines: l.append(swaps.get(q, q))
			n.spec.lines = l
	elif not on and not town_lines.is_empty():
		for n in T.npcs: if town_lines.has(n.root): n.spec.lines = town_lines[n.root]
		town_lines = {}


func p5_town() -> void:
	s.go_place("town")
	s.hour = 11.0
	s.hour_run = 0.0
	s.film()
	s.main.sound.music("town")
	s.main.sound.air("town")
	_town_story(true)
	_cart(Vector3(0.2, 0, 30.0), PI)
	for n in s.main.town.npcs: if n.job == "patrol": n.wait = 45.0
	var tk: Node3D = s.prop("trunk")
	cart.add_child(tk)
	tk.position = Vector3(0, 0.92, -0.35)
	var R: Node3D = s.enter("reiner", Vector3(1.6, 0, 24.4), PI)
	var F: Node3D = s.enter("father", Vector3(0.75, 0, 24.4), PI / 2)
	s.hero = R
	R.feel("wide", "oh")
	R.look = Vector3(0, 7, 6)
	s.move(Vector3(0.6, 7.5, 24), Vector3(0, 5.5, 4), Vector3(1.4, 2.0, 27.0), Vector3(0.8, 2.6, 10), 5.5, 48)
	await s.fade(0.0, 1.0)
	s.ui.place("Thistlewick")
	await s.wait(4.2)
	s.cut(Vector3(0.2, 1.55, 22.3), Vector3(1.3, 1.5, 24.4), 38)
	R.do("look", 2.4)
	await s.say("reiner", "It's so... upward.")
	F.look = R
	R.turn_to(F)
	R.look = F
	s.two(F, R, -1.0, 2.1, 36, 0.06)
	await s.say("father", "This is me, then. The road's no friend to a cart after dark.", { "eyes": "soft", "mouth": "flat" })
	await s.say("father", "Through the square, east street, out to the lookout. You'll not miss it. It's the only thing up there that hums.", { "do": "point" })
	s.over(F, R, 1.0, 34)
	await s.say("reiner", "Da. I'll go in at the door.", { "eyes": "stern", "mouth": "flat" })
	s.over(R, F, -1.0, 34)
	F.feel("soft", "smile")
	await s.wait(0.6)
	_embrace(F, R, 2.0)
	s.cut(Vector3(2.7, 1.4, 22.8), Vector3(1.1, 1.35, 24.4), 36)
	await s.wait(1.9)
	await s.say("father", "Good lad.", { "eyes": "soft", "mouth": "smile", "do": "pat" })
	await s.fade(1.0, 0.8)
	F.visible = false
	cart.visible = false
	R.place(Vector3(0.8, 0, 22.6), PI)
	R.feel("open", "flat")
	s.play()
	await s.fade(0.0, 0.8)
	s.ui.objective("Through the square to the lookout, at the end of the east street")
	var D: Dictionary = s.main.bake.town.door
	s.uses.append({ "pos": Vector3(D.x, 0, D.z), "r": 1.5, "label": "Look at the hatch", "f": func(): s.ui.toast("A door, in the ground, locked. Pink light in the cracks. Probably nothing.") })
	var id := run_id
	await reach(Vector3(25.5, 0, 0), 2.2)
	if not live(id): return
	s.film()
	R.go_free([Vector3(27.0, 0, 0.0)], 1.4)
	s.cut(Vector3(23.2, 1.9, 1.5), Vector3(28, 1.7, -0.4), 42)
	await s.wait(1.4)
	R.face_yaw = PI / 2
	R.feel("wide", "oh")
	s.face(R, 0.5, 1.6, 36)
	await s.say("reiner", "There you are.", { "eyes": "wide", "mouth": "smile" })
	s.main.sfx("bell", null, -8.0)
	await s.wait(0.8)
	await s.fade(1.0, 1.0)
	_town_story(false)


# ==================================================================== 6 == --
func _campus_busy(h: float) -> void:
	s.campus.open(h)
	s.campus.held = true
	s.hour_run = 0.0
	s.hour = h


func p6_academy() -> void:
	s.go_place("academy")
	s.film()
	s.main.sound.music("academy")
	s.main.sound.air("school")
	_campus_busy(12.2)
	var R: Node3D = s.enter("reiner", Vector3(0, 0, 50), PI)
	s.hero = R
	var B: Node3D = s.actor("brandt")
	s.campus.by.brandt.busy = true
	B.visible = true
	B.path = []
	B.place(Vector3(1.6, 0, 47.2), 0.4)
	B.pose = "hips"
	var g0: Node3D = s.stage.by_name.get("gate_0")
	var g1: Node3D = s.stage.by_name.get("gate_1")
	var b0: Basis = g0.basis
	var b1: Basis = g1.basis
	var gate := func(k: float) -> void:
		g0.basis = Basis(Vector3.UP, k * 1.6) * b0
		g1.basis = Basis(Vector3.UP, -k * 1.6) * b1
	gate.call(0.0)
	s.cut(Vector3(0.8, 1.4, 56), Vector3(0, 3.2, 45), 44)
	s.shot.p1 = Vector3(0.5, 1.5, 53.4)
	s.shot.l1 = Vector3(0, 3.8, 45)
	s.shot.d = 4.0
	R.go_free([Vector3(0, 0, 48.4)], 1.3)
	await s.fade(0.0, 1.0)
	await s.wait(2.2)
	R.look = B
	B.look = R
	s.over(R, B, 1.0, 36)
	await s.say("brandt", "Name.", { "eyes": "half", "mouth": "flat" })
	s.over(B, R, -1.0, 36)
	await s.say("reiner", "Reiner, sir. From the farm past the third...", { "eyes": "worry", "mouth": "flat" })
	s.face(B, -0.4, 1.5, 34)
	await s.say("brandt", "Milestone. You're late.", { "eyes": "half" })
	s.face(R, 0.4, 1.4, 34)
	await s.say("reiner", "The letter said noon.", { "eyes": "wide" })
	s.over(R, B, 1.0, 36)
	B.do("pointup", 2.4)
	await s.say("brandt", "And the bell says different.", { "eyes": "open", "mouth": "smirk", "after": 0.0 })
	# the bell, seen
	s.move(Vector3(2.6, 24.4, 7.0), Vector3(0, 26.9, -13.2), Vector3(1.4, 25.0, 2.4), Vector3(0, 26.9, -13.2), 5.4, 32)
	s.main.sfx("bell")
	s.stage.ring_bell()
	s.campus._ring_wave()
	await s.wait(4.6)
	s.cut(Vector3(0, 2.4, 40), Vector3(0, 16, -13), 46)
	s.shot.p1 = Vector3(0, 5.5, 35)
	s.shot.l1 = Vector3(0, 15, -13)
	s.shot.d = 4.5
	await s.wait(2.4)
	s.ui.place("The Mage Academy")
	s.move(Vector3(16, 9, 34), Vector3(0, 5, 4), Vector3(-12, 6.4, 30), Vector3(0, 6, 0), 8.0, 46)
	await s.wait(5.6)
	# the gate opens by itself
	R.look = null
	R.feel("wide", "oh")
	s.cut(Vector3(-1.2, 1.7, 50.6), Vector3(0, 2.2, 44), 46)
	s.main.sfx("gate")
	var t0: float = s.time
	while s.time < t0 + 2.4:
		gate.call(smoothstep(0.0, 1.0, (s.time - t0) / 2.4))
		if randf() < 0.1: s.sparkle(Vector3(randf_range(-2, 2), randf_range(0.5, 3.0), 45.9), 3, Color("bff4ea"))
		await s.beat()
	s.cut(Vector3(-1.9, 1.65, 50.6), Vector3(0.9, 1.45, 47.2), 42)
	await s.say("brandt", "Straight up the path. Owl House is left of the fountain, the one with the owl. Uniform's on the bed.", { "eyes": "open", "mouth": "flat", "do": "point" })
	R.look = B
	await s.say("reiner", "Thank you, sir.", { "do": "bow", "eyes": "open", "mouth": "smile" })
	s.face(B, 0.3, 1.5, 34)
	await s.say("brandt", "Go in at the door. Most do.", { "eyes": "soft", "mouth": "smile" })
	R.look = null
	R.feel("open", "smile")
	R.go_free([Vector3(0, 0, 44), Vector3(0, 0, 36)], 1.5)
	s.cut(Vector3(2.4, 2.2, 51), Vector3(0, 2.4, 38), 44)
	s.shot.p1 = Vector3(0.6, 3.2, 49)
	s.shot.l1 = Vector3(0, 4.0, 20)
	s.shot.d = 4.0
	await s.wait(3.4)
	await s.fade(1.0, 0.8)
	s.campus.by.brandt.busy = false


# ==================================================================== 7 == --
func p7_owl() -> void:
	s.go_place("academy")
	s.main.sound.music("school")
	s.main.sound.air("school")
	s.hero = s.enter("reiner", Vector3(0, 0, 36), PI)
	var R: Node3D = s.hero
	s.campus.open(16.4)
	var g0: Node3D = s.stage.by_name.get("gate_0")
	s.play()
	s.hour_run = 0.35 / s.campus.HOUR_SECS
	await s.fade(0.0, 0.8)
	s.ui.objective("Find Owl House, left of the fountain")
	s.ui.toast("Talk to anyone you like. Read what's posted. Nobody minds. Agnes minds.")
	var id := run_id
	await reach(Vector3(-28.2, 0, 21), 1.8)
	if not live(id): return
	s.ui.objective("Go in")
	var t0: float = s.time
	while live(id) and R.position.x < 150.0:
		if s.main.dev_auto and s.time > t0 + 1.0: R.place(s.stage._np(s.stage.node_id["owl_door"]), PI)
		await s.beat()
	if not live(id): return
	s.ui.objective("Find your bed: upstairs, the first door past the landing")
	var b: Dictionary = s.stage.data.rooms.owl.beds[0]
	await reach(Vector3(b.x + 0.9, b.y, b.z + 0.6), 1.5)
	if not live(id): return
	# Wim
	s.film()
	s.busy = true
	s.campus.held = true
	s.hour_run = 0.0
	s.hour = 19.8
	await s.fade(1.0, 0.5)
	var bw: Dictionary = s.stage.data.rooms.owl.beds[1]
	R.place(Vector3(b.x + 0.1, b.y, b.z + 1.75), PI / 2)
	var W: Node3D = s.actor("wim")
	s.campus.by.wim.busy = true
	W.visible = true
	W.path = []
	W.get_up()
	W.place(Vector3(bw.x - 0.1, bw.y, bw.z + 1.7), -PI / 2)
	W.pose = "shy"
	W.look = R
	R.look = W
	s.main.sound.music("evening")
	s.cut(Vector3(b.x + 1.06, b.y + 1.55, b.z - 0.75), Vector3(b.x + 1.06, b.y + 1.25, b.z + 1.8), 58)
	await s.fade(0.0, 0.6)
	await s.say("wim", "You're him. You're the other bed. I'm Wim. I've made it. The bed. I made mine first and then I was still nervous.", { "eyes": "worry", "mouth": "wavy" })
	s.face(R, -0.3, 1.2, 40)
	await s.say("reiner", "Reiner. It's a very flat bed.", { "eyes": "soft", "mouth": "smile" })
	s.face(W, 0.3, 1.2, 40)
	await s.say("wim", "Thank you! Are you any good? At it? You needn't say. I'm sort of good. My candle goes on the second go.", { "eyes": "open", "mouth": "smile" })
	s.face(R, 0.3, 1.2, 40)
	await s.say("reiner", "...Mine's more of a listener.", { "eyes": "half", "mouth": "wavy" })
	s.cut(Vector3(b.x + 1.06, b.y + 1.5, b.z - 0.5), Vector3(b.x + 1.06, b.y + 1.25, b.z + 1.8), 56)
	R.do("offer", 2.6)
	var bun: Node3D = s.prop("bun")
	R.hold("R", bun, Transform3D(Basis(), Vector3(0, -0.07, 0.05)))
	await s.say("reiner", "Do you like honey buns?")
	R.drop("R")
	W.hold("R", bun, Transform3D(Basis(), Vector3(0, -0.07, 0.05)))
	W.feel("wide", "oh")
	await s.wait(0.8)
	await s.say("wim", "I think this is going to be all right.", { "eyes": "happy", "mouth": "grin" })
	await s.fade(1.0, 1.0)
	W.drop("R").queue_free()
	# night, and the toy hen on the desk
	s.hour = 22.5
	s.leave("reiner")
	var U: Node3D = s.enter("reiner_uni", Vector3(b.x, b.y, b.z), b.yaw)
	s.hero = U
	U.lie_at(Vector3(b.x, b.y, b.z), b.yaw)
	U.eyes = "open"
	W.lie_at(Vector3(bw.x, bw.y, bw.z), bw.yaw)
	var hen: Node3D = keep(s.put("toyhen", Vector3(b.x + 1.06, b.y + 0.75, b.z - 0.72), 0.6))
	s.cut(Vector3(b.x + 1.35, b.y + 1.25, b.z + 0.3), Vector3(b.x + 0.9, b.y + 0.82, b.z - 0.7), 40)
	s.shot.l1 = Vector3(b.x + 0.2, b.y + 0.7, b.z - 0.6)
	s.shot.d = 4.0
	await s.fade(0.0, 1.0)
	await s.wait(1.6)
	await s.say("reiner_uni", "Duchess. I went in at the door.", { "eyes": "half", "mouth": "smile" })
	U.eyes = "shut"
	await s.wait(0.8)
	await s.fade(1.0, 1.4)
	U.get_up()
	W.get_up()
	s.campus.by.wim.busy = false
	s.busy = true


# ==================================================================== 8 == --
const CLASS := { "isolde": 2, "tobin": 5, "wim": 9, "maron": 12, "petra": 17, "nadi": 18, "otto": 1, "selma": 21, "kas": 15 }
const R_SEAT := 10
var candles := {}


func _class_set() -> void:
	var D: Dictionary = s.stage.data.rooms["1A"]
	for n in CLASS:
		var q: Dictionary = D.seats[CLASS[n]]
		var a: Node3D = s.actor(n)
		s.campus.by[n].busy = true
		a.visible = true
		a.path = []
		a.get_up()
		a.lod = 0
		a.drop("L")
		a.drop("R")
		a.place(Vector3(q.x, 0.048, q.z), q.yaw)
		a.sit(0.46, "desk")
		a.look = null
		a.feel("open", "flat")
	candles = {}
	for n in CLASS.keys() + ["reiner_uni"]:
		var q: Dictionary = D.seats[CLASS.get(n, R_SEAT)]
		candles[n] = keep(s.put("candle", Vector3(q.desk[0] + 0.02, 0.048 + 31 * 0.024, q.desk[1] - 0.2)))
	var H: Node3D = s.actor("halden")
	s.campus.by.halden.busy = true
	H.visible = true
	H.path = []
	H.lod = 0
	H.place(Vector3(-17.0, 0.048, -14.8), PI / 2)
	H.pose = "behind"


func _light(n: String, c := Color("ffb45a")) -> void:
	if not candles.has(n): return
	var f: Node3D = s.add_flame(candles[n].position + Vector3(0, 0.285, 0), 0.75, n in ["isolde", "maron", "reiner_uni", "tobin"])
	candles[n].set_meta("f", f)
	s.main.sfx("ignite")


func p8_lesson() -> void:
	# the first morning: to class
	s.go_place("academy")
	s.main.sound.music("school")
	s.main.sound.air("school")
	var hid := run_id
	s.hero = s.enter("reiner_uni", Vector3(-24.5, 0, 20.6), -PI / 2 + PI)
	var R: Node3D = s.hero
	s.campus.open(8.2)
	s.campus.lesson_done["%dp1" % s.campus.day] = true       # (the lesson's the film's)
	s.play()
	s.busy = true
	await s.fade(0.0, 0.8)
	s.ui.toast("First morning. The bell goes at half past eight.")
	s.ui.objective("Incantation, Lecture Hall 1A: ground floor, west")
	var D: Dictionary = s.stage.data.rooms["1A"]
	var q: Dictionary = D.seats[R_SEAT]
	await reach(Vector3(-8.5, 0.048, -10.4), 1.6)
	if not live(hid): return
	s.film()
	await s.fade(1.0, 0.6)
	# the lesson
	s.campus.held = true
	s.hour_run = 0.0
	s.hour = 9.0
	s.campus.pi = 1
	s.main.sound.music("lesson")
	_class_set()
	var H: Node3D = s.actor("halden")
	var M: Node3D = s.actor("maron")
	var W: Node3D = s.actor("wim")
	R.place(Vector3(q.x, 0.048, q.z), q.yaw)
	R.sit(0.46, "sit")
	R.look = H
	var door: Dictionary = s.stage.doors["1A"]
	door.want = false
	door.by_hand = true
	s.move(Vector3(-7.2, 2.4, -17.6), Vector3(-16, 1.2, -14), Vector3(-8.6, 1.9, -16.4), Vector3(-17, 1.4, -14.6), 5.0, 46)
	await s.fade(0.0, 0.8)
	await s.say("halden", "The candle. You have each been given one. It has no ambitions, and will not flatter you.", { "eyes": "half", "do": "point", "d": 2.0 })
	s.cut(Vector3(-15.2, 1.5, -13.4), H.head_pos() - Vector3(0, 0.1, 0), 36)
	H.pose = "stand"
	H.do("offer2", 2.4)
	await s.say("halden", "The incantation, then: wake, small one, and see. Who will begin? ...Miss Isolde.", { "eyes": "open" })
	var I: Node3D = s.actor("isolde")
	I.pose = "sitread"
	s.face(I, 0.5, 1.6, 34)
	I.do("flick", 0.9)
	await s.wait(0.5)
	_light("isolde")
	await s.wait(0.5)
	await s.say("halden", "Without looking up. Yes. Very good.", { "eyes": "half" })
	var T: Node3D = s.actor("tobin")
	s.face(T, -0.5, 1.6, 34)
	T.feel("half", "smirk")
	T.do("snap", 1.0)
	await s.wait(0.55)
	_light("tobin")
	s.sparkle(candles.tobin.position + Vector3(0, 0.4, 0), 14)
	await s.say("tobin", "Naturally.", { "eyes": "half", "mouth": "smirk" })
	s.move(Vector3(-15.8, 1.75, -19.0), Vector3(-11.0, 0.95, -16.4), Vector3(-15.6, 1.65, -14.4), Vector3(-10.6, 0.95, -13), 4.6, 46)
	for n in ["otto", "nadi", "kas", "petra", "selma", "wim"]:
		var a: Node3D = s.actor(n)
		a.do("castdo", 0.9)
		await s.wait(0.42)
		_light(n)
		if n == "wim": W.feel("happy", "grin", 3.0)
		await s.wait(0.16)
	await s.wait(0.4)
	s.face(M, 0.45, 1.6, 34)
	M.feel("half", "flat")
	await s.wait(0.4)
	_light("maron")                                   # (nobody saw her do anything)
	await s.wait(0.9)
	s.over(R, H, 1.0, 38)
	await s.say("halden", "And our late arrival. Reiner, is it? When you are ready.", { "eyes": "open", "mouth": "flat" })
	for n in CLASS: s.actor(n).look = R
	R.look = candles["reiner_uni"]
	R.feel("worry", "wavy")
	s.face(R, 0.35, 1.4, 34)
	R.do("gulp", 0.9)
	await s.wait(1.0)
	# three tries, in the player's hands
	var words := [["Wake", "U"], ["small", "L"], ["one", "R"], ["and", "D"], ["see", "U"]]
	R.stand()
	R.pose = "cast"
	R.position += Vector3(0.1, 0, 0)
	s.cut(Vector3(-13.6, 1.45, q.z + 1.1), Vector3(q.x - 0.2, 1.1, q.z), 40)
	await s.cast(words, { "gap": 0.85, "name": "The Candle" })
	R.do("castdo", 1.1)
	await s.wait(0.55)
	s.main.sfx("fizz")
	s.smoke(candles["reiner_uni"].position + Vector3(0, 0.3, 0), 3, false)
	await s.wait(1.0)
	s.cut(candles["reiner_uni"].position + Vector3(-0.7, 0.4, 0.4), candles["reiner_uni"].position + Vector3(0, 0.2, 0), 30)
	await s.wait(1.2)
	s.face(R, 0.3, 1.4, 34)
	await s.say("reiner_uni", "...It's thinking.", { "eyes": "worry", "mouth": "wavy" })
	s.actor("petra").do("giggle", 1.4)
	s.over(R, H, -1.0, 38)
	await s.say("halden", "Again. A little more conviction.", { "do": "nod" })
	s.cut(Vector3(-13.6, 1.45, q.z - 1.2), Vector3(q.x - 0.2, 1.1, q.z), 40)
	R.feel("stern", "flat")
	await s.cast(words, { "gap": 0.72, "name": "The Candle, with conviction" })
	R.do("castdo", 1.0)
	await s.wait(0.5)
	s.main.sfx("poof")
	var cp: Vector3 = candles["reiner_uni"].position
	candles["reiner_uni"].visible = false
	var melt: Node3D = keep(s.put("candle_melt", cp))
	s.burst(cp + Vector3(0, 0.2, 0), Color("f6eeda"), Color("e8dcbc"), 18, 1.4, -5.0, 0.03, 0.8)
	s.cut(cp + Vector3(-0.8, 0.45, 0.5), cp + Vector3(0, 0.1, 0), 30)
	await s.wait(1.4)
	s.face(W, 0.2, 1.4, 36)
	await s.say("wim", "It's... warm, though?", { "eyes": "worry", "mouth": "smile" })
	s.over(R, H, 1.0, 38)
	await s.say("halden", "I have never seen that. Forty years. Once more, and gently.", { "eyes": "wide", "do": "scratch" })
	s.cut(Vector3(-14.0, 1.7, q.z + 0.2), Vector3(q.x, 1.25, q.z), 38)
	R.feel("squeeze", "flat")
	await s.cast(words, { "gap": 0.6, "name": "The Candle, gently" })
	R.do("castbig", 1.4)
	s.runes(R.position + Vector3(-0.6, 1.35, 0), -PI / 2, Color("ffcf6a"), 1.4, 0.4)
	await s.wait(0.6)
	# it goes everywhere but the candle
	s.main.sfx("whoosh")
	s.shake = 0.8
	s.cut(Vector3(-12.4, 1.5, -16.6), H.head_pos() + Vector3(0, 0.1, 0), 40)
	var spark := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3.ONE * 0.1
	spark.mesh = bm
	var mt := StandardMaterial3D.new()
	mt.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mt.albedo_color = Color("ffc04a")
	spark.material_override = mt
	s.add_child(spark)
	keep(spark)
	var pts := [R.position + Vector3(-0.5, 1.3, 0), Vector3(-14, 3.1, -11.5), Vector3(-19.4, 2.6, -13), Vector3(-15.5, 3.2, -18), Vector3(-12, 2.2, -13.4), H.head_pos() + Vector3(0, 0.36, 0)]
	for k in pts.size() - 1:
		var u := 0.0
		while u < 1.0:
			u += s.dt_last * 4.2
			spark.position = (pts[k] as Vector3).lerp(pts[k + 1], minf(1.0, u))
			spark.rotation = Vector3(u * 8.0, u * 5.0, 0)
			if randf() < 0.5: s.burst(spark.position, Color("ffd27a"), Color("ff8a3a"), 3, 0.6, -2.0, 0.025, 0.5)
			await s.beat()
		s.main.sfx("bounce")
		for n in CLASS:
			if randf() < 0.3: s.actor(n).do("shield", 0.8)
	spark.visible = false
	var hat: Node3D = H.P.get("hat")
	var fl: Node3D = s.add_flame(H.head_pos() + Vector3(0, 0.5, 0), 1.6)
	fol.append({ "n": fl, "f": func(n, _d): n.global_position = (hat if hat else H.P.head).global_transform * Vector3(0, 0.4, 0) })
	s.main.sfx("ignite")
	s.face(H, 0.3, 1.5, 36, 0.1)
	H.feel("half", "flat")
	await s.wait(1.2)
	await s.say("halden", "...Am I on fire?", { "eyes": "half", "mouth": "flat" })
	s.move(Vector3(-16.6, 2.0, -12), Vector3(-11, 1.0, -15), Vector3(-16.0, 1.9, -12.6), Vector3(-11, 1.0, -15), 3.0, 50)
	s.main.sfx("laugh")
	for n in CLASS:
		if n in ["maron", "isolde", "selma"]: continue
		var a: Node3D = s.actor(n)
		a.look = H
		a.feel("happy", "grin")
		a.do("laugh", 2.8)
	R.pose = "stand"
	R.feel("squeeze", "wavy")
	R.do("facepalm", 3.0)
	await s.wait(2.0)
	# Maron, who isn't laughing
	s.face(M, -0.35, 1.3, 32)
	M.look = H
	M.feel("half", "flat")
	await s.wait(0.8)
	s.cut(M.hand_pos("R") + Vector3(-0.55, 0.12, 0.3), M.hand_pos("R"), 30)
	M.do("flick", 0.9)
	await s.wait(0.42)
	s.burst(M.hand_pos("R"), Color("ff8ac8"), Color("ffd0ea"), 6, 0.5, 0.2, 0.018, 0.6)
	s.cut(Vector3(-15.4, 1.8, -13.6), H.head_pos() + Vector3(0, 0.2, 0), 34)
	s.kill_flame(fl)
	fol = []
	s.main.sfx("puff")
	s.burst(H.head_pos() + Vector3(0, 0.45, 0), Color("ff9ad0"), Color("ffffff"), 16, 1.0, 0.3, 0.03, 0.8)
	for n in CLASS: s.actor(n).gest = ""
	H.feel("wide", "oh")
	H.do("pat", 1.4)
	await s.wait(0.8)
	await s.say("halden", "Who put me out?", { "eyes": "wide", "mouth": "flat", "do": "look", "d": 2.0 })
	s.move(Vector3(-15.8, 1.8, -13.2), Vector3(-10.6, 1.0, -15), Vector3(-15.0, 1.7, -14.6), Vector3(-10.6, 1.0, -15.4), 3.0, 46)
	for n in CLASS: s.actor(n).feel("open", "flat")
	await s.wait(1.8)
	R.look = M
	M.look = R
	s.over(R, M, -1.0, 32)
	M.feel("half", "flat")
	await s.wait(1.3)
	M.look = null
	M.pose = "sitread"
	await s.wait(0.6)
	s.main.sfx("bell")
	s.stage.ring_bell()
	await s.say("halden", "...That is the bell. Wax off your desks. Reiner, off the desk, the floor, and, I think, the window.", { "eyes": "half" })
	await s.fade(1.0, 0.8)
	# afterwards
	s.main.sound.music("evening")
	s.hour = 10.0
	for n in CLASS:
		if n != "maron": s.actor(n).visible = false
	H.visible = false
	for n in candles: if candles[n].has_meta("f"): s.kill_flame(candles[n].get_meta("f"))
	for n in candles: if n != "reiner_uni": candles[n].visible = false
	R.place(Vector3(q.x - 0.0, 0.048, q.z + 0.1), -PI / 2)
	R.pose = "stand"
	R.look = melt
	R.feel("sad", "frown")
	R.reach.R = melt.position + Vector3(0.1, 0.08, 0)
	M.stand()
	M.place(Vector3(-9.85, 0.048, -14.7), 0.0)
	s.cut(Vector3(-14.4, 1.5, -14.9), Vector3(-11.6, 1.1, -13), 42)
	await s.fade(0.0, 0.8)
	await s.wait(1.2)
	M.go_free([Vector3(-9.95, 0.048, q.z - 1.5)], 1.1)
	await s.wait(1.4)
	M.turn_to(R)
	M.look = R
	s.cut(Vector3(-14.0, 1.45, q.z - 2.0), Vector3(-10.8, 1.3, q.z - 0.6), 38)
	await s.say("maron", "You're telling it.", { "eyes": "half", "mouth": "flat" })
	R.reach.R = null
	R.do("flinch", 0.9)
	R.turn_to(M)
	R.look = M
	R.feel("wide", "oh", 1.2)
	await s.wait(0.6)
	s.over(M, R, 1.0, 34)
	await s.say("reiner_uni", "Sorry?", { "eyes": "worry", "mouth": "flat" })
	s.over(R, M, -1.0, 32)
	await s.say("maron", "The candle. You're telling it to wake. It's been told all day. Ask it.", { "eyes": "open", "mouth": "flat" })
	s.face(R, -0.3, 1.3, 34)
	await s.say("reiner_uni", "I did ask it.", { "eyes": "sad", "mouth": "frown" })
	s.face(M, 0.35, 1.3, 32)
	await s.say("maron", "You asked it not to embarrass you. That's a different question.", { "eyes": "half", "mouth": "smirk" })
	s.two(R, M, 1.0, 2.2, 36, 0.05)
	R.feel("wide", "flat")
	await s.wait(0.7)
	M.go_free([Vector3(-9.9, 0.048, q.z - 0.9), Vector3(-9.0, 0.048, -11.2), Vector3(-8.5, 0.048, -10.0)], 1.2)
	M.look = null
	await s.wait(0.9)
	await s.say("reiner_uni", "I'm Reiner!", { "eyes": "open", "mouth": "smile" })
	R.look = M
	s.cut(Vector3(-11.6, 1.6, -13.2), Vector3(-8.6, 1.35, -10.4), 38)
	await s.until(func(): return M.path.is_empty(), 4.0)
	M.turn_to(R)
	M.look = R
	await s.say("maron", "I know. You set fire to Halden.", { "eyes": "half", "mouth": "smirk" })
	await s.wait(0.5)
	await s.say("maron", "...Maron.", { "eyes": "soft", "mouth": "smile" })
	M.look = null
	M.go_free([Vector3(-8.5, 0.048, -8.4), Vector3(-5, 0.048, -7.7)], 1.3)
	s.face(R, 0.2, 1.4, 34)
	R.feel("soft", "smile")
	await s.wait(1.6)
	await s.fade(1.0, 1.0)
	for n in CLASS: s.campus.by[n].busy = false
	s.campus.by.halden.busy = false
	door.erase("by_hand")


# ==================================================================== 9 == --
func _scene_people(list: Array) -> void:
	for n in list:
		s.campus.by[n].busy = true
		var a: Node3D = s.actor(n)
		a.path = []
		a.get_up()
		a.lod = 0
		a.visible = true
		a.look = null
		a.drop("L")
		a.drop("R")
		a.feel("open", "flat")
		a.gest = ""


func _free_people() -> void:
	for p in s.campus.people: p.busy = false


func p9_weeks() -> void:
	s.go_place("academy")
	s.film()
	s.main.sound.music("lesson")
	s.main.sound.air("room")
	_campus_busy(11.0)
	var R: Node3D = s.enter("reiner_uni", Vector3(0, 0, 0), 0)
	s.hero = R
	# the library
	_scene_people(["maron", "sabine", "isolde"])
	var y := 3.648
	var M: Node3D = s.actor("maron")
	var SB: Node3D = s.actor("sabine")
	var q: Dictionary = s.stage.data.rooms.library.seats[1]
	R.place(Vector3(11.6, y, -11.88), PI)
	R.sit(0.46, "sit")
	M.place(Vector3(13.9, y, -15.4), -PI / 2)
	M.pose = "read"
	M.hold("L", s.prop("book_open"), Transform3D(Basis(Vector3.RIGHT, 0.5) * Basis(Vector3.UP, PI), Vector3(-0.1, -0.02, 0.08)))
	SB.place(Vector3(8.4, y, -14.0), PI / 2)
	var I: Node3D = s.actor("isolde")
	I.place(Vector3(16.0, y, -11.88), PI)
	I.sit(0.46, "sitread")
	var stack: Array = []
	for k in 6:
		var b: Node3D = keep(s.put("book", Vector3(11.6 + (k % 2) * 0.02, y + 0.744 + k * 0.12, -12.5), k * 0.4))
		stack.append(b)
	s.cut(Vector3(13.6, y + 1.55, -10.6), Vector3(11.7, y + 1.05, -12.6), 42)
	await s.fade(0.0, 0.8)
	s.ui.place("The second week  ·  the Library")
	R.look = stack[5]
	R.feel("stern", "flat")
	await s.say("reiner_uni", "Breath, beneath it. Up a little. Only a little.", { "after": 0.0 })
	R.do("castdo", 1.2)
	await s.wait(0.6)
	s.main.sfx("rune")
	var t0: float = s.time
	while s.time < t0 + 1.3:
		stack[5].position.y = y + 0.744 + 0.6 + (s.time - t0) * 0.12 + sin(s.time * 16.0) * 0.01
		stack[5].rotation.y += 0.02
		await s.beat()
	R.feel("wide", "grin")
	s.face(R, 0.3, 1.3, 36)
	await s.wait(0.6)
	s.main.sfx("whoosh")
	s.cut(Vector3(13.6, y + 1.4, -10.4), Vector3(12.0, y + 1.9, -13), 50)
	t0 = s.time
	var v := Vector3(1.6, 5.0, -1.8)
	while s.time < t0 + 1.25:
		for k in 5: stack[k].position += Vector3(sin(k * 2.0) * 0.8, 1.2 - (s.time - t0) * 6.0, cos(k * 1.7) * 0.6) * s.dt_last
		for k in 5: stack[k].rotation += Vector3(0.05, 0.04, 0.03 * k)
		for k in 5: stack[k].position.y = maxf(stack[k].position.y, y + 0.05 if k % 2 else y + 0.744)
		stack[5].position += v * s.dt_last
		v.y -= 5.2 * s.dt_last
		if stack[5].position.y > y + 2.9: v.y = -1.0
		stack[5].rotation += Vector3(0.1, 0.12, 0.05)
		await s.beat()
	s.main.sfx("clunk")
	R.do("shield", 1.2)
	M.reach.R = stack[5].position
	s.cut(Vector3(12.3, y + 1.5, -13.5), M.head_pos() - Vector3(0, 0.1, 0), 40)
	t0 = s.time
	var from: Vector3 = stack[5].position
	while s.time < t0 + 0.5:
		stack[5].position = from.lerp(M.head_pos() + Vector3(-0.42, 0.18, 0.12), (s.time - t0) / 0.5)
		M.reach.R = stack[5].position
		await s.beat()
	s.main.sfx("catch")
	await s.wait(0.7)
	s.face(SB, 0.2, 1.5, 36)
	await s.say("sabine", "Shhh.", { "eyes": "stern", "mouth": "small" })
	M.look = R
	M.drop("L")
	M.pose = "stand"
	s.cut(Vector3(12.4, y + 1.5, -13.4), M.head_pos() - Vector3(0, 0.1, 0), 36)
	await s.say("maron", "You were holding it the wrong way up. All the words had gone to the top.", { "eyes": "half", "mouth": "flat" })
	await s.fade(1.0, 0.6)
	M.reach.R = null
	# the yard
	for b in stack: b.queue_free()
	_free_people()
	_scene_people(["maron", "corvin", "tobin", "wim", "otto"])
	s.main.sound.air("school")
	s.hour = 15.4
	R.stand()
	R.place(Vector3(-33.4, 0, -8.4), -PI / 2)
	var C: Node3D = s.actor("corvin")
	C.place(Vector3(-31.4, 0, -6.4), -PI * 0.7)
	C.pose = "crossed"
	s.actor("tobin").place(Vector3(-32.6, 0, -11.2), -PI / 2)
	s.actor("wim").place(Vector3(-31.6, 0, -12.6), -PI / 2)
	s.actor("otto").place(Vector3(-32.8, 0, -13.8), -PI / 2)
	for n in ["tobin", "wim", "otto", "corvin"]: s.actor(n).look = R
	M.place(Vector3(-26.4, 0, -4.4), -PI * 0.55)
	M.pose = "read"
	var mb: Node3D = s.prop("book_open")
	M.hold("L", mb, Transform3D(Basis(Vector3.RIGHT, 0.5) * Basis(Vector3.UP, PI), Vector3(-0.1, -0.02, 0.08)))
	s.cut(Vector3(-36.2, 1.4, -6.4), Vector3(-33.0, 1.2, -8.6), 42)
	await s.fade(0.0, 0.6)
	s.ui.place("The third week  ·  the Practice Yard")
	await s.say("corvin", "Feet. Breath. Word. Straw's that way.", { "eyes": "half", "do": "point" })
	R.pose = "cast"
	R.feel("stern", "flat")
	await s.wait(0.5)
	R.do("castdo", 1.1)
	s.runes(R.position + Vector3(-0.7, 1.2, 0), -PI / 2, Color("7ad0ff"), 1.0, 0.28)
	await s.wait(0.5)
	s.main.sfx("whoosh")
	var sp := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3.ONE * 0.12
	sp.mesh = bm
	var mt := StandardMaterial3D.new()
	mt.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mt.albedo_color = Color("7ad0ff")
	sp.material_override = mt
	s.add_child(sp)
	keep(sp)
	var fly_to := func(a: Vector3, b: Vector3, sec: float, arc: float):
		var u := 0.0
		while u < 1.0:
			u += s.dt_last / sec
			sp.position = a.lerp(b, minf(1.0, u)) + Vector3(0, sin(minf(1.0, u) * PI) * arc, 0)
			sp.rotation = Vector3(u * 8.0, u * 6.0, 0)
			if randf() < 0.4: s.burst(sp.position, Color("bfe8ff"), Color("7ad0ff"), 2, 0.4, 0.0, 0.025, 0.5)
			await s.beat()
	s.cut(Vector3(-38, 1.6, -5.2), Vector3(-41, 1.2, -8), 46)
	await fly_to.call(R.position + Vector3(-0.6, 1.3, 0), Vector3(-41.3, 1.06, -8), 0.5, 0.2)
	s.main.sfx("bounce")
	await fly_to.call(Vector3(-41.3, 1.06, -8), Vector3(-37.6, 1.1, -2.6), 0.35, 0.3)
	s.main.sfx("bounce")
	s.cut(Vector3(-35.2, 1.5, -4.2), Vector3(-31.4, 1.5, -7.4), 46)
	C.do("flinch", 0.9)
	R.do("shield", 0.9)
	await fly_to.call(Vector3(-37.6, 1.1, -2.6), Vector3(-31.2, 1.95, -6.9), 0.35, 0.2)
	s.cut(Vector3(-28.2, 1.4, -2.7), M.head_pos(), 38)
	M.look = null
	M.do("tilt", 1.0)
	await fly_to.call(Vector3(-31.2, 1.95, -6.9), Vector3(-26.15, 1.72, -4.3), 0.6, 0.1)
	await fly_to.call(Vector3(-26.15, 1.72, -4.3), Vector3(-19, 4.4, 1.0), 0.6, 0.3)
	s.burst(Vector3(-19, 4.4, 1.0), Color("7ad0ff"), Color.WHITE, 26, 2.2, -2.0, 0.05, 1.0)
	sp.visible = false
	s.main.sfx("puff")
	R.feel("wide", "oh")
	await s.say("reiner_uni", "Sorry! Sorry, Maron!", { "eyes": "wide", "mouth": "shout" })
	s.face(M, 0.35, 1.3, 34)
	await s.say("maron", "You've improved. Last week you missed the sky.", { "eyes": "half", "mouth": "smirk" })
	s.two(C, R, 1.0, 3.0, 40, 0.1)
	C.look = R
	C.pose = "stand"
	await s.say("corvin", "Feet were good.", { "eyes": "soft", "do": "nod" })
	await s.fade(1.0, 0.6)
	# the glasshouse
	_free_people()
	_scene_people(["maron", "wren", "kas", "petra"])
	var WR: Node3D = s.actor("wren")
	s.hour = 13.6
	R.pose = "stand"
	R.look = null
	R.feel("open", "flat")
	R.place(Vector3(29.4, 0, -6.42), PI)
	R.pose = "lean"
	WR.place(Vector3(31.2, 0, -5.7), -PI * 0.6)
	var K: Node3D = s.actor("kas")
	K.place(Vector3(28.4, 0, -6.42), PI)
	K.pose = "lean"
	M.place(Vector3(36.6, 0, -6.42), PI)
	M.pose = "lean"
	s.cut(Vector3(29.9, 1.6, -8.9), Vector3(29.3, 1.05, -6.4), 42)
	await s.fade(0.0, 0.6)
	s.ui.place("The fourth week  ·  the Glasshouse")
	R.look = Vector3(29.4, 0.8, -7.2)
	R.pose = "carry"
	await s.say("wren", "Hum to it, low. It wants a tune it can lean on.", { "eyes": "soft", "mouth": "smile" })
	s.main.sfx("hum")
	R.feel("shut", "small")
	await s.wait(1.8)
	s.main.sfx("bite")
	R.do("flinch", 1.2)
	R.feel("squeeze", "shout", 1.4)
	s.burst(Vector3(29.4, 0.95, -6.9), Color("7ab04a"), Color("4f8f3a"), 12, 1.4, -4.0, 0.03, 0.6)
	s.shake = 0.4
	await s.wait(1.0)
	await s.say("wren", "Oh, it's bitten you. It only does that when it likes someone. Or the other thing.", { "eyes": "worry", "mouth": "wavy", "do": "mouthcover", "d": 1.8 })
	s.face(K, -0.4, 1.3, 36)
	await s.say("kas", "It thinks you're sad. You hummed the goodbye one.", { "eyes": "sad", "mouth": "flat" })
	s.face(R, 0.3, 1.3, 34)
	R.feel("sad", "frown")
	R.look = null
	await s.wait(1.6)
	s.face(M, 0.4, 1.4, 34)
	M.look = R
	M.feel("soft", "flat")
	await s.wait(1.5)
	await s.fade(1.0, 0.8)
	# by the fountain, at dusk
	_free_people()
	_scene_people(["maron"])
	s.main.sound.music("evening")
	s.main.sound.air("night")
	s.hour = 18.75
	var fw := Vector3(-0.707, 0, 0.707)                # out from the bench
	var al := Vector3(0.707, 0, 0.707)                 # along it
	var mid := Vector3(4.53, 0, 9.47)
	R.place(mid - al * 0.5, -PI * 0.25)
	R.sit(0.5, "sit")
	R.feel("down", "frown")
	R.look = null
	M.drop("L")
	M.place(Vector3(0.8, 0, 5.0), 0.5)
	var can: Node3D = keep(s.put("candle", mid + Vector3(0, 0.5, 0)))
	var near := func(a: Node3D, side: float, d := 1.15) -> void: s.cut(a.head_pos() + fw * d + al * side + Vector3(0, 0.02, 0), a.head_pos() - Vector3(0, 0.02, 0), 36)
	var both := func(d := 2.3) -> void: s.cut(mid + fw * d + Vector3(0, 1.35, 0), mid + Vector3(0, 1.02, 0), 38)
	s.move(mid + fw * 5.2 + Vector3(0, 1.7, 0), mid + Vector3(0, 1.3, 0), mid + fw * 3.2 + Vector3(0, 1.3, 0), mid + Vector3(0, 1.1, 0), 6.0, 40)
	await s.fade(0.0, 1.0)
	s.ui.place("The fifth week")
	await s.say("reiner_uni", "Wake, small one. ...Please.", { "eyes": "sad", "mouth": "frown" })
	s.smoke(can.position + Vector3(0, 0.3, 0), 2, false)
	await s.wait(0.6)
	M.go_free([Vector3(2.2, 0, 7.6), Vector3(2.9, 0, 10.2), mid + al * 0.5 + fw * 0.6], 1.3)
	both.call(3.0)
	await s.until(func(): return M.path.is_empty(), 7.0)
	R.look = M
	M.place(mid + al * 0.5, -PI * 0.25)
	M.sit(0.5, "sit")
	M.look = can
	await s.wait(0.9)
	await s.say("maron", "That's a nice candle.", { "eyes": "half", "mouth": "flat" })
	R.look = can
	await s.say("reiner_uni", "It's the wickedest candle in the school.", { "eyes": "half", "mouth": "wavy" })
	near.call(R, -0.35)
	R.look = null
	await s.say("reiner_uni", "Why did they let me in? There are people in Sarrow who'd give a ship for that letter. I can't even smoke properly.", { "eyes": "sad", "mouth": "frown" })
	near.call(M, 0.35)
	M.look = null
	await s.say("maron", "I've been wondering that myself.", { "eyes": "open", "mouth": "flat" })
	await s.wait(0.4)
	await s.say("maron", "People with no gift stop. It's how you tell. They ask once, and it says no, and they go and be something else.", { "eyes": "soft", "mouth": "flat" })
	M.look = null
	M.feel("down", "flat")
	near.call(M, -0.3)
	await s.say("maron", "You've asked that thing every day for two years. I don't know what that is. But it isn't nothing.", { "eyes": "half", "mouth": "flat" })
	both.call()
	R.look = M
	R.feel("wide", "flat")
	await s.wait(0.8)
	await s.say("reiner_uni", "Would you teach me?", { "eyes": "open", "mouth": "flat" })
	near.call(M, -0.6)
	M.look = R
	M.feel("wide", "small", 1.0)
	M.do("hat", 1.3)
	await s.wait(1.1)
	M.do("", 0.1)
	await s.say("maron", "...I'm expensive.", { "eyes": "half", "mouth": "flat" })
	near.call(R, -0.35)
	await s.say("reiner_uni", "How expensive?", { "eyes": "worry", "mouth": "wavy" })
	near.call(M, 0.3)
	M.look = null
	await s.wait(0.5)
	await s.say("maron", "What does your mother bake?", { "eyes": "lookL", "mouth": "smirk" })
	s.move(mid + fw * 3.4 + Vector3(0, 1.6, 0), mid + Vector3(0, 1.2, 0), Vector3(7.0, 4.6, 24), Vector3(0, 5.5, 0), 6.0, 42)
	s.main.sfx("bell", null, -6.0)
	s.stage.ring_bell()
	s.campus._ring_wave()
	await s.wait(4.6)
	await s.fade(1.0, 1.2)
	_free_people()


# =================================================================== 10 == --
func p10_bargain() -> void:
	_farm(17.6)
	s.film()
	s.main.sound.music("evening")
	s.main.sound.air("room")
	var kx := 600.0
	var R: Node3D = s.enter("reiner_uni", Vector3(kx - 1.65, 0, 0.25), PI / 2)
	s.hero = R
	var M: Node3D = s.enter("maron", Vector3(kx + 2.6, 0, 0.6), -PI / 2)
	var Mo: Node3D = s.enter("mother", Vector3(kx - 0.8, 0, -0.55), 0.0)
	var F: Node3D = s.enter("father", Vector3(kx + 0.4, 0, -0.55), 0.0)
	var L: Node3D = s.enter("lotte", Vector3(kx - 0.8, 0, 1.05), PI)
	R.sit(0.46, "sit")
	Mo.sit(0.46, "sit")
	F.sit(0.46, "sit")
	L.sit(0.46, "sit")
	M.pose = "shy"
	var ty := 31 * 0.024
	keep(s.put("jug", Vector3(kx - 0.9, ty, 0.3)))
	keep(s.put("loaf", Vector3(kx - 0.2, ty, 0.2), 0.4))
	for k in 3: keep(s.put("bun", Vector3(kx + 0.1 + k * 0.16, ty, 0.42 - (k % 2) * 0.1)))
	for k in [[-0.8, -0.12], [0.4, -0.12], [-0.8, 0.62], [0.4, 0.62]]: keep(s.put("mug", Vector3(kx + k[0] + 0.18, ty, k[1])))
	var let: Node3D = s.prop("letter")
	F.hold("R", let, Transform3D(Basis(Vector3.RIGHT, -1.2), Vector3(0.1, -0.02, 0.12)))
	F.pose = "sitread"
	s.move(Vector3(kx + 3.1, 2.1, 2.3), Vector3(kx - 0.6, 0.9, 0), Vector3(kx + 2.6, 1.8, 2.1), Vector3(kx - 0.4, 0.95, 0.1), 5.0, 56)
	for a in [Mo, L]: a.look = M
	R.look = F
	await s.fade(0.0, 1.0)
	s.ui.place("The farm  ·  holiday")
	await s.wait(1.0)
	await s.say("father", "\"...and, while I bear no grudge regarding the hat...\" He says you set fire to him.", { "eyes": "half", "mouth": "flat" })
	s.face(R, 0.0, 1.15, 42)
	await s.say("reiner_uni", "Once.", { "eyes": "worry", "mouth": "wavy" })
	s.face(F, -0.4, 1.3, 40)
	await s.say("father", "\"...he is the hardest worker in the year, and the worst. I should recommend a tutor, and a bucket.\"", { "eyes": "soft" })
	s.face(Mo, 0.3, 1.2, 40)
	Mo.look = M
	await s.say("mother", "And this is the girl.", { "eyes": "open", "mouth": "smile" })
	M.look = Mo
	M.do("curtsy", 1.8)
	s.cut(Vector3(kx + 1.1, 1.4, 1.5), M.head_pos() - Vector3(0, 0.25, 0), 44)
	await s.say("maron", "Maron, ma'am. From the first year.", { "eyes": "open", "mouth": "flat" })
	s.face(L, 0.3, 1.2, 40)
	await s.say("lotte", "Are you a witch?", { "eyes": "wide", "mouth": "flat" })
	await s.say("mother", "Lotte.", { "as": "Mother" })
	s.face(M, -0.3, 1.2, 38)
	M.look = L
	await s.say("maron", "Only a pupil.", { "eyes": "half", "mouth": "smile" })
	s.face(L, 0.3, 1.2, 40)
	await s.say("lotte", "Do a magic.", { "eyes": "stern", "mouth": "flat" })
	# a trick: Lotte is off her chair before anyone can stop her
	L.stand()
	L.go_free([Vector3(kx - 0.8, 0, 1.7), Vector3(kx + 1.2, 0, 1.75), Vector3(kx + 1.75, 0, 1.05)], 2.2)
	s.cut(Vector3(kx + 0.6, 1.5, 2.4), Vector3(kx + 1.6, 1.0, 0.7), 50)
	await s.until(func(): return L.path.is_empty(), 5.0)
	M.turn_to(L)
	L.turn_to(M)
	M.look = L
	L.look = M
	R.look = M
	F.look = M
	Mo.look = M
	M.pose = "kneel"
	await s.wait(0.5)
	var dir: Vector3 = (L.position - M.position).normalized()
	var sd := Vector3(dir.z, 0, -dir.x)
	var mp: Vector3 = M.position + dir * 0.36
	var ms: Vector3 = (M.position + L.position) * 0.5
	var coin: Node3D = s.prop("coin")
	coin.scale = Vector3.ONE * 1.6
	M.hold("R", coin, Transform3D(Basis(Vector3.RIGHT, PI / 2), Vector3(0, -0.12, 0.05)))
	M.reach.R = mp + Vector3(0, 0.98, 0) - sd * 0.06
	M.hand.R = "point"
	var cm: Vector3 = ms + sd * (1.7 if sd.z > 0.0 else -1.7)
	s.cut(cm + Vector3(0, 1.15, 0), ms + Vector3(0, 0.98, 0), 40)
	await s.wait(0.6)
	await s.say("maron", "One copper. Watch it closely.", { "eyes": "half", "mouth": "smile" })
	M.reach.L = mp + Vector3(0, 1.0, 0) + sd * 0.06
	M.hand.L = "open"
	await s.wait(0.5)
	M.reach.L = mp + Vector3(0, 1.1, 0) + sd * 0.3
	coin.visible = false
	M.hand.R = "open"
	s.main.sfx("card")
	s.face(L, 0.4, 1.0, 40)
	L.feel("wide", "oh")
	await s.wait(1.0)
	s.cut(cm + Vector3(0, 1.15, 0), ms + Vector3(0, 0.98, 0), 36)
	M.reach.L = null
	M.hand.L = ""
	M.reach.R = L.head_pos() - sd * 0.2 - dir * 0.02
	await s.wait(0.6)
	coin.visible = true
	M.hand.R = "point"
	s.main.sfx("coin")
	s.sparkle(M.hand_pos("R"), 6)
	await s.say("maron", "And there you were, hiding it.", { "eyes": "soft", "mouth": "smile" })
	M.reach.R = mp + Vector3(0, 1.0, 0)
	L.do("clap", 1.6)
	await s.say("lotte", "AGAIN! Do it AGAIN!", { "eyes": "happy", "mouth": "shout" })
	M.reach.R = null
	M.hand.R = ""
	var cc: Node3D = M.drop("R")
	if cc: cc.queue_free()
	M.stand()
	M.pose = "shy"
	M.turn_to(R)
	M.look = R
	s.face(R, 0.0, 1.15, 44)
	await s.say("reiner_uni", "Which craft was that? Breath? Calling?", { "eyes": "wide", "mouth": "oh" })
	s.face(M, 0.25, 1.3, 38)
	await s.say("maron", "None of them. It was only a trick. You looked where I was looking.", { "eyes": "lookR", "mouth": "smirk" })
	M.feel("down", "flat")
	await s.wait(0.6)
	M.go_free([Vector3(kx + 1.55, 0, 0.25)], 1.1)
	L.go_free([Vector3(kx + 1.3, 0, 1.75), Vector3(kx - 0.3, 0, 1.75)], 1.6)
	await s.until(func(): return M.path.is_empty() and L.path.is_empty(), 4.0)
	M.face_yaw = -PI / 2
	L.face_yaw = PI
	# the money
	F.stand()
	F.drop("R").queue_free()
	F.sit(0.46, "sit")
	s.cut(Vector3(kx + 2.4, 1.5, 1.0), Vector3(kx - 0.1, 1.05, 0.1), 46)
	await s.say("father", "What do you ask, for teaching him?", { "eyes": "open", "mouth": "flat" })
	s.face(M, 0.3, 1.3, 38)
	M.look = F
	await s.say("maron", "A silver a week.", { "eyes": "open", "mouth": "flat" })
	s.cut(Vector3(kx - 0.25, 1.5, 1.35), Vector3(kx - 0.2, 1.12, -0.5), 46)
	F.look = Mo
	Mo.look = F
	F.feel("worry", "flat")
	Mo.feel("worry", "flat")
	await s.wait(1.4)
	Mo.feel("soft", "smile")
	Mo.do("nod", 1.0)
	await s.wait(0.9)
	var jar: Node3D = keep(s.put("jar", Vector3(kx - 0.5, ty, 0.0)))
	s.main.sfx("coin")
	Mo.do("offer2", 1.4)
	s.cut(Vector3(kx + 0.5, 1.25, 1.2), Vector3(kx - 0.4, 0.85, 0.0), 40)
	await s.wait(0.9)
	var pile: Node3D = keep(s.put("coins", Vector3(kx - 0.1, ty, 0.2)))
	s.main.sfx("coins")
	await s.say("mother", "It's the winter money. There's six weeks in it.", { "eyes": "open", "mouth": "flat" })
	s.face(F, 0.3, 1.3, 40)
	F.look = M
	await s.say("father", "Is six weeks enough?", { "eyes": "worry", "mouth": "flat" })
	s.face(R, 0.0, 1.15, 42)
	R.feel("sad", "frown")
	R.look = pile
	await s.wait(1.3)
	s.face(M, 0.25, 1.15, 36)
	M.look = pile
	M.feel("down", "flat")
	await s.wait(1.2)
	M.look = R
	M.feel("soft", "flat")
	await s.wait(1.0)
	M.go_free([Vector3(kx + 1.38, 0, 0.3)], 1.0)
	M.reach.R = Vector3(kx + 0.75, ty + 0.06, 0.3)
	s.cut(Vector3(kx + 0.9, 1.2, 1.0), Vector3(kx - 0.1, 0.8, 0.2), 38)
	await s.wait(0.7)
	var half: Node3D = keep(s.put("coins", Vector3(kx + 0.45, ty, 0.28), 1.2, 0.8))
	pile.visible = false
	var t0: float = s.time
	while s.time < t0 + 0.9:
		half.position.x = kx + 0.45 - (s.time - t0) * 0.5
		M.reach.R = half.position + Vector3(0.1, 0.06, 0.0)
		await s.beat()
	s.main.sfx("coin")
	M.reach.R = null
	s.face(M, 0.3, 1.2, 36)
	await s.say("maron", "Three. The other three I'll owe him.", { "eyes": "half", "mouth": "flat" })
	await s.say("maron", "...And a dozen honey buns. I've heard things.", { "eyes": "lookL", "mouth": "smirk" })
	s.face(Mo, -0.2, 1.2, 38)
	Mo.look = M
	Mo.feel("soft", "smile")
	await s.wait(1.3)
	s.cut(Vector3(kx + 2.9, 1.9, 2.2), Vector3(kx - 0.4, 0.95, 0.2), 52)
	await s.say("mother", "Sit down, Maron. You'll have your supper first.", { "eyes": "happy", "mouth": "smile" })
	L.do("cheer", 1.4)
	await s.say("lotte", "She can have MY chair! I'll stand! I like standing!", { "eyes": "happy", "mouth": "shout" })
	M.feel("wide", "small")
	await s.wait(1.4)
	M.feel("soft", "smile")
	await s.wait(1.2)
	await s.fade(1.0, 1.2)


# =================================================================== 11 == --
func p11_first() -> void:
	_farm(18.5)
	s.film()
	s.main.sound.music("evening")
	var sx := -17.2
	var sz := 2.2
	var R: Node3D = s.enter("reiner_uni", Vector3(sx + 0.95, 0, sz + 0.1), -PI / 2)
	var M: Node3D = s.enter("maron", Vector3(sx + 0.1, 0, sz + 1.3), PI)
	var L: Node3D = s.enter("lotte", Vector3(-17.5, 0, -0.6), 0.5)
	s.hero = R
	var sw: Dictionary = s.stage.swing
	sw.th = 0.17
	sw.om = 0.0
	sw.amp = 0.17                                     # about half a metre each way
	L.ride(sw.n, sw.seat)
	L.pose = "swing"
	L.pose_k = { "sw": sw }
	var grips: Array = []
	for sd in [1, -1]:                                # a hand to each rope
		var gm := Node3D.new()
		sw.n.add_child(gm)
		gm.position = sw.seat + Vector3(sd * 12.5 * 0.024 - 0.012, 0.47, 0.012)
		keep(gm)
		grips.append(gm)
	L.reach = { "L": grips[0], "R": grips[1] }
	L.look = R
	var C: Node3D = keep(s.put("candle", Vector3(sx, 16 * 0.024, sz)))
	M.look = R
	R.look = C
	s.move(Vector3(-6, 3.2, 12), Vector3(-18, 2.6, 0), Vector3(-10.5, 1.9, 7.4), Vector3(-17.4, 1.5, 1.4), 6.0, 42)
	await s.fade(0.0, 1.2)
	s.ui.place("The first lesson")
	await s.wait(3.6)
	s.two(R, M, -1.0, 2.5, 38, 0.1)
	await s.say("maron", "What are you afraid it will do?", { "eyes": "open", "mouth": "flat" })
	R.look = M
	await s.say("reiner_uni", "Nothing.", { "eyes": "open", "mouth": "flat" })
	s.face(M, 0.3, 1.3, 34)
	await s.say("maron", "Then why are your hands shaking?", { "eyes": "half", "mouth": "flat" })
	s.face(R, -0.3, 1.3, 34)
	R.look = C
	await s.say("reiner_uni", "No. That's it. I'm afraid it'll do nothing. Again.", { "eyes": "sad", "mouth": "frown" })
	s.over(R, M, 1.0, 34)
	M.feel("soft", "flat")
	await s.wait(0.9)
	await s.say("maron", "Good. Now you know what you've been asking it for.", { "eyes": "soft", "mouth": "smile" })
	R.look = M
	R.feel("wide", "flat")
	M.pose = "kneel"
	s.cut(Vector3(sx - 1.6, 1.2, sz + 2.0), Vector3(sx + 0.4, 0.95, sz + 0.6), 40)
	await s.say("maron", "Forget the word. Who wakes Lotte in the morning?", { "eyes": "open", "mouth": "flat" })
	await s.say("reiner_uni", "I do.", { "eyes": "open" })
	await s.say("maron", "How?", { "eyes": "half", "mouth": "smile" })
	s.face(R, 0.3, 1.2, 34)
	R.look = L
	await s.say("reiner_uni", "...Quietly. I sit on the end of the bed, and say it's a nice day, and I wait.", { "eyes": "soft", "mouth": "smile" })
	s.face(M, -0.3, 1.2, 32)
	await s.say("maron", "Say it like that.", { "eyes": "soft", "mouth": "smile" })
	R.look = C
	R.pose = "kneel"
	var words := [["Wake", "U"], ["small", "L"], ["one", "R"], ["and", "D"], ["see", "U"]]
	s.cut(Vector3(sx - 1.1, 0.95, sz + 1.0), Vector3(sx + 0.5, 0.85, sz + 0.1), 38)
	var tries := 0
	while true:
		R.feel("soft", "flat")
		var r: float = await s.cast(words, { "gap": 1.12, "wide": 0.34, "name": "As you'd wake Lotte" })
		tries += 1
		if r >= 0.75 or tries >= 3: break
		s.main.sfx("fizz")
		s.smoke(C.position + Vector3(0, 0.3, 0), 3, false)
		s.face(M, -0.3, 1.3, 34)
		await s.say("maron", ["You hurried. Nobody's timing you. Sit on the end of the bed.", "Closer. I think it heard you. Again."][mini(tries - 1, 1)], { "eyes": "soft", "mouth": "flat" })
		s.cut(Vector3(sx - 1.1, 0.95, sz + 1.0), Vector3(sx + 0.5, 0.85, sz + 0.1), 38)
	s.main.sound.music("")
	R.reach.R = C.position + Vector3(0.22, 0.2, 0.1)
	R.hand.R = "open"
	await s.say("reiner_uni", "It's a nice day. You needn't hurry.", { "eyes": "soft", "mouth": "smile" })
	s.cut(C.position + Vector3(-0.5, 0.35, 0.45), C.position + Vector3(0, 0.26, 0), 28)
	await s.wait(2.2)
	s.main.sfx("chime")
	var f: Node3D = s.add_flame(C.position + Vector3(0, 0.285, 0), 0.8)
	s.flames[-1].k = 0.05
	var t0: float = s.time
	while s.time < t0 + 1.6:
		s.flames[-1].k = lerpf(0.05, 1.0, smoothstep(0.0, 1.0, (s.time - t0) / 1.6))
		await s.beat()
	s.main.sound.music("wonder")
	s.face(R, 0.25, 1.1, 32)
	R.feel("wide", "oh")
	await s.wait(2.0)
	R.feel("happy", "grin")
	await s.wait(0.6)
	L.feel("wide", "oh")
	s.cut(Vector3(-15.5, 1.0, 1.5), Vector3(-17.2, 0.86, -0.05), 40)
	# she lets go near the top of the swing forward: her hips leave the seat with its speed and a push of her own
	await s.until(func(): return sw.om > 0.0 and sw.th > sw.amp * 0.66, 5.0)
	var hw: Vector3 = (L.P.hips as Node3D).global_position
	var fwd := Vector3(sin(L.yaw), 0, cos(L.yaw))
	var v_out: float = sw.om * sw.len * cos(sw.th) + 1.15
	var v_up: float = sw.om * sw.len * sin(sw.th) + 1.75
	L.reach = { "L": null, "R": null }
	L.alight()
	L.do("leap", 0.6)
	L.set_meta("close", true)
	sw.amp = 0.0
	sw.om -= 0.22                                      # (and the seat is kicked back by it)
	L.feel("happy", "shout")
	var oy: float = maxf(0.0, hw.y - L.rest_y)
	(L.F.hips as Node3D).position.y = hw.y - oy
	var t1: float = s.time
	var h := oy
	while h > 0.0 or s.time < t1 + 0.08:
		var u: float = s.time - t1
		h = maxf(0.0, oy + v_up * u - 4.905 * u * u)
		L.position = Vector3(hw.x, h, hw.z) + fwd * v_out * u
		L.prev_pos = L.position
		await s.beat()
	L.position.y = 0.0
	L.remove_meta("close")
	s.main.sfx("step")
	await s.say("lotte", "It MOVED!", { "eyes": "happy", "mouth": "shout", "do": "cheer" })
	R.look = L
	s.face(R, 0.3, 1.35, 36)
	await s.say("reiner_uni", "It moved.", { "eyes": "happy", "mouth": "grin" })
	M.look = Vector3(sx + 0.1, 1.0, sz)
	s.face(M, 0.25, 1.15, 32, -0.1)
	M.feel("soft", "smile")
	await s.wait(1.4)
	M.feel("happy", "smile")
	await s.wait(1.3)
	R.look = M
	M.look = R
	M.feel("half", "flat")                           # (she's caught herself)
	await s.wait(0.5)
	await s.say("maron", "It's very small.", { "eyes": "lookL", "mouth": "smirk" })
	await s.say("reiner_uni", "It's the biggest one I've ever seen.", { "eyes": "happy", "mouth": "grin" })
	s.move(Vector3(-13.8, 1.4, 5.2), Vector3(-17, 1.0, 2.0), Vector3(-11.5, 2.4, 8.2), Vector3(-17.6, 1.8, 1.2), 5.0, 40)
	s.hour_run = 0.1
	await s.wait(3.6)
	M.stand()
	R.stand()
	R.reach.R = null
	R.hand.R = ""
	M.do("dust", 1.2)
	await s.say("maron", "Same time next week. Bring the buns.", { "eyes": "half", "mouth": "smile" })
	M.look = null
	M.go_free([Vector3(-13, 0, 4.6), Vector3(-4, 0, 8), Vector3(0.5, 0, 13.6), Vector3(0.5, 0, 30)], 1.5)
	R.look = M
	s.cut(Vector3(-19.2, 1.6, 0.4), Vector3(-13, 1.3, 5.2), 40)
	await s.wait(1.0)
	await s.say("reiner_uni", "Maron! Thank you!", { "eyes": "happy", "mouth": "grin", "do": "wave" })
	await s.until(func(): return M.position.z > 7.0, 12.0)
	M.do("wave", 1.4)
	await s.wait(2.0)
	# the card in the book
	s.hour = 19.5
	s.hour_run = 0.0
	s.main.sound.music("evening")
	s.cut(Vector3(sx + 2.2, 1.6, sz + 1.2), Vector3(sx + 0.9, 1.2, sz + 0.1), 36)
	var bk: Node3D = s.prop("book_open")
	R.face_yaw = 0.9
	R.pose = "read"
	R.look = null
	R.feel("down", "smile")
	R.hold("L", bk, Transform3D(Basis(Vector3.RIGHT, 0.5) * Basis(Vector3.UP, PI), Vector3(-0.1, -0.02, 0.08)))
	await s.wait(1.4)
	s.main.sfx("card")
	var card: Node3D = (load("res://assets/cards.glb") as PackedScene).instantiate()
	s.main.voxelize(card)
	for c in card.get_children(): c.visible = String(c.name).contains("heart")
	R.hold("R", card, Transform3D(Basis(Vector3.RIGHT, -0.5), Vector3(0.04, 0.02, 0.1)))
	R.feel("wide", "flat")
	s.cut(R.head_pos() + Vector3(0.35, 0.25, 0.1) - Vector3(sin(R.yaw), 0, cos(R.yaw)) * 0.5, R.hand_pos("R") + Vector3(0, 0.06, 0), 38)
	await s.wait(1.2)
	s.face(R, 0.4, 1.2, 34)
	await s.say("reiner_uni", "A playing card? ...Huh. Somebody's bookmark.", { "eyes": "open", "mouth": "flat" })
	await s.wait(0.8)
	s.move(R.head_pos() + Vector3(1.6, 0.4, 1.8), R.head_pos(), Vector3(-9, 4.2, 9), Vector3(-17, 2.5, 0), 5.0, 38)
	await s.wait(3.6)
	await s.fade(1.0, 1.6)
	R.drop("R").queue_free()
	R.drop("L").queue_free()


# =================================================================== 12 == --
func p12_night() -> void:
	s.go_place("town")
	s.hour = 23.0
	s.film()
	s.main.sound.music("night")
	s.main.sound.air("night")
	s.hero = null
	var T: Node3D = s.main.town
	for n in T.npcs: n.root.visible = false
	var tt: Node3D = s.main.tt
	var D: Dictionary = s.main.bake.town.door
	# the sleeping square, the alley, the cat
	s.move(Vector3(9, 3.4, 8), Vector3(-4, 3.6, -5), Vector3(4, 2.6, 4), Vector3(-9, 3.0, -4.5), 6.0, 44)
	await s.fade(0.0, 1.6)
	await s.wait(3.6)
	s.move(Vector3(-11.4, 1.5, -4.5), Vector3(-18, 1.1, -4.5), Vector3(-14.2, 1.1, -4.4), Vector3(-19.4, 0.8, -4.6), 4.6, 40)
	await s.wait(3.4)
	# she comes down out of the dark under her umbrella
	tt_on = true
	tt.visible = true
	s.main.fx.visible = true
	tt.cancel_action(false)
	tt.seat = null
	tt.position = Vector3(-12.5, 5.4, -4.5)
	var ml := OmniLight3D.new()
	ml.light_color = Color("a8bcff")
	ml.light_energy = 1.5
	ml.omni_range = 7.5
	ml.position = Vector3(-14.2, 3.0, -4.2)
	s.add_child(ml)
	keep(ml)
	tt.yaw = -PI / 2
	tt.t_yaw = -PI / 2
	tt.vel = Vector3.ZERO
	if tt.U.st == "away": tt.toggle_item()
	for k in 14: tt.update(0.05, { "x": 0.0, "z": 0.0, "run": false, "jump": false, "jump_held": false })
	if tt.U.open_t < 0.5: tt.toggle_open()
	for k in 14: tt.update(0.05, { "x": 0.0, "z": 0.0, "run": false, "jump": false, "jump_held": false })
	tt.on_ground = false
	tt.air = 4.6
	tt.vy = -0.4
	tt_in.jump_held = true
	s.cut(Vector3(-16.4, 0.5, -4.2), Vector3(-12.5, 3.6, -4.5), 46)
	s.shot.l1 = Vector3(-12.5, 1.1, -4.5)
	s.shot.d = 3.6
	s.main.sfx("flutter")
	await s.until(func(): return tt.on_ground, 8.0)
	tt_in.jump_held = false
	s.main.sfx("step")
	s.cut(Vector3(-14.9, 1.25, -4.2), Vector3(-12.5, 1.2, -4.5), 40)
	await s.wait(0.9)
	tt.toggle_open()
	await s.wait(0.8)
	s.cut(Vector3(-10.2, 1.5, -4.2), Vector3(-15.4, 1.1, -4.5), 40)
	# to the hatch; a word with the cat
	tt_in.x = -0.9
	await s.until(func(): return tt.position.x < -17.5, 9.0)
	tt_in.x = 0.0
	await s.wait(0.4)
	s.cut(Vector3(-19.9, 1.0, -3.8), Vector3(-17.6, 1.35, -4.5), 38)
	tt.face_base = "smug"
	tt.play("hatTip")
	await s.wait(1.7)
	s.main.sfx("meow")
	s.main.sfx("gate", null, -6.0)
	var t0: float = s.time
	while s.time < t0 + 0.9:
		T.door_open = smoothstep(0.0, 1.0, (s.time - t0) / 0.9)
		await s.beat()
	s.main.sfx("chime")
	# one look back, at the hills
	tt.t_yaw = PI / 2
	s.cut(Vector3(-16.2, 1.45, -4.9), Vector3(-17.5, 1.45, -4.5), 34)
	tt.face_base = "smile"
	await s.wait(2.4)
	tt.face_base = "smug"
	tt.t_yaw = -PI / 2
	await s.wait(0.6)
	s.cut(Vector3(-14.4, 1.2, -4.4), Vector3(-18.2, 1.0, -4.5), 38)
	s.main.fx.card_puff(tt.position + Vector3(0, 0.9, 0), 14)
	s.main.sfx("card")
	tt.visible = false
	await s.wait(0.5)
	t0 = s.time
	while s.time < t0 + 0.7:
		T.door_open = 1.0 - smoothstep(0.0, 1.0, (s.time - t0) / 0.7)
		await s.beat()
	T.door_open = 0.0
	s.main.sfx("door_shut")
	await s.wait(1.0)
	await s.fade(1.0, 0.1)
	await s.wait(0.6)
	await s.title_card("TRAP TRICK", "End of the Opening Act", 5.0)
	tt_on = false
	tt.visible = false
	if tt.U.st != "away": tt.toggle_item()
	for n in T.npcs: n.root.visible = true
	await s.wait(0.5)
