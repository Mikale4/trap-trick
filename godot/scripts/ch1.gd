extends Node
## Chapter One: "The Lantern Board". Reiner at the bottom of the school, the High Table at the top of it, and somebody
## about at night who thinks it all very funny. Fourteen parts, run by act1.gd after the Opening Act's.

var s: Node3D                         # the story
var a: Node                           # the Opening Act (its helpers)
const NAMES := ["The Lantern Board", "Fetches", "Late", "With love", "The Proctor", "Wicks", "The first wick", "All is well", "A night errand", "The ledger", "Nine days", "Founders' Night", "Still burning", "A card she didn't deal"]
const FY := [0.048, 3.648, 7.248]
const ORDER := ["Lucan", "Sibyl", "Dorn", "Sunniva", "Bram", "Cato", "Dove", "Liss", "Orin", "Yve", "Joss", "Ilse", "Maron", "Rowan", "Isolde", "Marta", "Fenn", "Tobin", "Petra", "Nadi", "Kas", "Otto", "Selma", "Bet", "Wim", "Reiner"]
const PUP := ["isolde", "tobin", "wim", "petra", "nadi", "otto", "selma", "kas", "maron", "bet", "rowan", "ilse", "fenn", "yve", "joss", "marta", "bram", "sunniva", "cato", "liss", "orin", "dove"]
var levelled := false                 # the board: the lanterns all hung on one line
var lev_k := 0.0
var bl_home := {}
var vane := {}                        # the Proctor's rounds, on the night errand
var spotted := 0.0
var lean := Vector2.ZERO              # which way the founder's candle leans


func list() -> Array: return [c1_board, c2_fetches, c3_late, c4_love, c5_proctor, c6_wicks, c7_first, c8_well, c9_errand, c10_ledger, c11_nine, c12_founders, c13_still, c14_card]


func reset() -> void:
	vane = {}
	spotted = 0.0
	levelled = false
	lean = Vector2.ZERO


# ------------------------------------------------------------------- helpers --
func act(n: String) -> Node3D: return s.actor(n)


func open(h: float) -> void:
	s.go_place("academy")
	s.campus.chapter = 1
	a._campus_busy(h)
	s.main.sound.air("school")
	board(25, false)


## Take people for a scene, out of their school day.
func take(l: Array) -> void: a._scene_people(l)


## Send whoever is standing about here elsewhere, so nobody's in the scene who isn't of it.
func clear(x: float, z: float, r: float) -> void:
	for p in s.campus.people:
		if p.get("busy", false): continue
		var q: Vector3 = p.a.position
		if Vector2(q.x - x, q.z - z).length() < r:
			p.busy = true
			p.a.visible = false


func at(n: String, x: float, z: float, yaw: float, f := 0.0) -> Node3D:
	var p: Node3D = act(n)
	if p.pose == "lie": p.get_up()
	p.visible = true
	p.stand()
	p.place(Vector3(x, f, z), yaw)
	p.feel("open", "flat")
	p.look = null
	p.gest = ""
	p.reach = { "L": null, "R": null }
	return p


func reiner(x: float, z: float, yaw: float, f := 0.0) -> Node3D:
	var r: Node3D = s.enter("reiner_uni", Vector3(x, f, z), yaw)
	s.hero = r
	return r


func all_look(l: Array, t_) -> void:
	for n in l: act(n).look = t_


func flame(p: Vector3, sc := 0.8, light := true) -> Dictionary:
	s.add_flame(p, sc, light)
	return s.flames[-1]


func douse(f: Dictionary) -> void:
	if f.is_empty() or not is_instance_valid(f.n): return
	s.smoke(f.n.position + Vector3(0, 0.06, 0), 5, false)
	s.main.sfx("wick_out")
	s.kill_flame(f.n)


## The Lantern Board: the first n lanterns burning; Reiner's (the last) too, if `his`.
func board(n: int, his: bool) -> void:
	if not s.stages.has("academy"): return
	var B: Dictionary = s.stages.academy.by_name
	for i in 26:
		var g: Node3D = B.get("blg_%d" % i)
		if g: g.visible = i < n or (his and i == 25)
		var tu: Node3D = B.get("bl_%d" % i)
		if tu: tu.visible = true


func lit(i: int, on: bool) -> void:
	var g: Node3D = s.stages.academy.by_name.get("blg_%d" % i)
	if g: g.visible = on


func lantern_pos(i: int) -> Vector3:
	var g: Node3D = s.stages.academy.by_name.get("bl_%d" % i)
	return g.position if g else Vector3(5.8, 1, -14)


func read_board() -> void:
	var t_ := ""
	var i := 0
	for n in [1, 3, 5, 8, 9]:
		var row: Array = []
		for k in n:
			row.append(ORDER[i])
			i += 1
		t_ += "   ".join(row) + "\n\n"
	s.read("The Lantern Board", t_ + ("The lanterns hang level." if levelled else "Each burns as its pupil burns. Nobody lights it for them, and nobody may blow it out."))


func card(n: Node3D, side: String, suit := "heart") -> Node3D:
	var c: Node3D = (load("res://assets/cards.glb") as PackedScene).instantiate()
	s.main.voxelize(c)
	for q in c.get_children(): q.visible = String(q.name).contains(suit)
	n.hold(side, c, Transform3D(Basis(Vector3.RIGHT, -0.5), Vector3(0.04, 0.02, 0.1)))
	return c


func drop(n: Node3D, side: String) -> void:
	var x: Node3D = n.drop(side)
	if x: x.queue_free()


func music(n: String) -> void: s.main.sound.music(n)


func tt_at(p: Vector3, yaw: float, open_umbrella := false) -> Node3D:
	var tt: Node3D = s.main.tt
	a.tt_on = true
	a.tt_in = { "x": 0.0, "z": 0.0, "run": false, "jump": false, "jump_held": false }
	tt.visible = true
	s.main.fx.visible = true
	tt.cancel_action(false)
	tt.seat = null
	tt.position = p
	tt.floor_y = p.y
	tt.on_ground = true
	tt.vel = Vector3.ZERO
	tt.vy = 0.0
	tt.speed = 0.0
	tt.yaw = yaw
	tt.t_yaw = yaw
	tt.face_base = "smug"
	if open_umbrella and tt.U.st == "away":
		tt.toggle_item()
		for k in 16: tt.update(0.05, a.tt_in)
		if tt.U.open_t < 0.5: tt.toggle_open()
	if not open_umbrella and tt.U.st != "away": tt.toggle_item()
	for k in 12: tt.update(0.05, a.tt_in)
	return tt


func tt_gone() -> void:
	a.tt_on = false
	s.main.tt.visible = false


## Pupils standing in the hall before the board, in three ranks, facing it.
func hall_crowd(l: Array, look_at = null) -> void:
	for i in l.size():
		var n: String = l[i]
		var x := 2.5 - (i % 3) * 1.0
		var z := -10.6 - (i / 3) * 1.02 - (0.34 if i % 3 == 1 else 0.0)
		var p: Node3D = at(n, x, z, PI / 2, FY[0])
		p.look = look_at
		p.lod = 0 if i % 3 == 0 else 1


## A ring of onlookers round a point: from angle a0 to a1.
func ring(l: Array, c: Vector3, r: float, a0: float, a1: float, look_at = null) -> void:
	for i in l.size():
		var u: float = float(i) / maxf(1.0, l.size() - 1)
		var rr := r + (0.95 if i % 2 else 0.0)
		var an := lerpf(a0, a1, u)
		var p: Node3D = at(l[i], c.x + sin(an) * rr, c.z + cos(an) * rr, an + PI, c.y)
		p.look = look_at
		p.lod = 0 if i % 2 == 0 else 1


## A face straight on, as the body sits, whatever it's looking at (for people in rows).
func seat_face(p: Node3D, d := 1.2, fov := 40.0, side := 0.0) -> void:
	var f := Vector3(sin(p.yaw), 0, cos(p.yaw))
	s.cut(p.head_pos() + f * d + Vector3(f.z, 0, -f.x) * side + Vector3(0, 0.04, 0), p.head_pos(), fov)


func duel_stands(p: Vector3, q: Vector3) -> Array:
	var out: Array = []
	for w in [p, q]:
		a.keep(s.put("stand", w))
		a.keep(s.put("candle", w + Vector3(0, 1.056, 0)))
		out.append(w + Vector3(0, 1.056 + 0.285, 0))
	return out


# --------------------------------------------------------------------- frame --
func update(dt: float) -> void:
	if s.place == "academy" and s.stages.has("academy"):
		var f: Node3D = s.stages.academy.by_name.get("fc_flame")
		if f:
			var u: float = s.time * 7.0
			f.basis = Basis(Vector3.RIGHT, lean.y + sin(u * 0.7) * 0.03) * Basis(Vector3.BACK, -lean.x + sin(u * 0.9) * 0.03) * Basis().scaled(Vector3(1.0 + sin(u) * 0.06, 1.0 + sin(u * 1.4) * 0.1, 1.0 + cos(u) * 0.06))
		lev_k = move_toward(lev_k, 1.0 if levelled else 0.0, dt * 0.45 if levelled else 9.0)
		for i in 26:
			for pre in ["bl_", "blg_"]:
				var n: Node3D = s.stages.academy.by_name.get(pre + str(i))
				if n == null: continue
				if not bl_home.has(n): bl_home[n] = n.position
				var h: Vector3 = bl_home[n]
				var k := smoothstep(0.0, 1.0, clampf(lev_k * 1.6 - i * 0.02, 0.0, 1.0))
				n.position = h.lerp(Vector3(h.x, 1.75 + (h.y - bl_home[s.stages.academy.by_name["bl_%d" % i]].y), -14.4 + (i - 12.5) * 0.29), k) if lev_k > 0.0 else h
	if not vane.is_empty(): _vane_update(dt)
	if s.place == "garden":
		s.main._summon_update(dt)
		s.main.garden_t += dt
		for f in s.main.floaters:
			var n: Node3D = f.node
			n.position.y = f.y0 + sin(s.main.garden_t * 0.6 + f.ph) * 0.45
			n.rotation.y += dt * f.spin


# ==================================================================== 1 == --
func c1_board() -> void:
	open(8.2)
	s.film()
	music("academy")
	var l: Array = PUP.duplicate()
	take(l + ["lucan", "dorn", "sibyl", "aurel", "halden", "vane"])
	for n in ["lucan", "dorn", "sibyl", "halden", "vane"]: act(n).visible = false
	board(0, false)
	clear(0, -13, 10)
	var A := at("aurel", 4.7, -11.2, -PI / 2, FY[0])
	var order: Array = ["tobin", "isolde", "wim", "nadi", "petra", "otto", "kas", "selma", "bet", "maron", "ilse", "rowan", "fenn", "marta", "joss", "yve", "bram", "sunniva", "cato", "liss", "orin", "dove"]
	hall_crowd(order, A)
	var R := reiner(1.6, -18.1, PI / 2, FY[0])
	var W := at("wim", 2.6, -18.2, PI / 2, FY[0])
	var M := at("maron", -1.2, -17.4, PI / 2, FY[0])
	all_look([ "wim", "maron"], A)
	R.look = A
	s.move(Vector3(10, 14, 40), Vector3(0, 12, -8), Vector3(4, 8, 30), Vector3(0, 10, -8), 6.5, 44)
	await s.fade(0.0, 1.6)
	s.main.sfx("bell")
	s.stage.ring_bell()
	s.campus._ring_wave()
	await s.wait(1.0)
	await s.title_card("CHAPTER ONE", "The Lantern Board", 4.4)
	s.move(Vector3(-2.4, 2.9, -9.2), Vector3(4, 1.5, -15), Vector3(-1.2, 2.3, -10.4), Vector3(5.4, 1.6, -14.4), 5.0, 54)
	await s.say("aurel", "Good morning. A new term, and a clean board.", { "eyes": "soft", "mouth": "flat" })
	s.face(A, 0.3, 1.6, 36)
	await s.say("aurel", "Each lantern is one of you. It burns as you burn. Nobody lights it for you, and nobody, I remind you, may blow it out.", { "do": "pointup", "d": 2.4, "eyes": "open" })
	A.turn_to(Vector3(5.8, 0, -14.4))
	A.do("castbig", 2.0)
	s.move(Vector3(2.9, 2.1, -14.4), Vector3(5.8, 2.2, -14.4), Vector3(3.2, 1.6, -14.4), Vector3(5.8, 1.6, -14.4), 5.6, 60)
	await s.wait(0.8)
	var i := 0
	for n in [1, 3, 5, 8, 8]:
		for k in n:
			lit(i, true)
			s.main.sfx("ting")
			i += 1
			await s.wait(0.11)
		await s.wait(0.3)
	var T: Node3D = act("tobin")
	s.face(T, 0.4, 1.4, 36)
	await s.say("tobin", "Eighteenth! In my first year! Somebody write to my grandfather.", { "eyes": "happy", "mouth": "grin", "do": "cheer" })
	s.cut(lantern_pos(25) + Vector3(-1.0, 0.15, 0.35), lantern_pos(25) + Vector3(0, 0.1, 0), 30)
	s.main.sound.music("")
	await s.wait(2.2)
	R.feel("worry", "flat")
	s.face(R, 0.3, 1.4, 36)
	R.look = lantern_pos(25)
	await s.wait(1.2)
	W.look = R
	s.cut(Vector3(4.2, 1.6, -17.3), Vector3(2.2, 1.45, -18.2), 42)
	await s.say("wim", "Perhaps it's shy.", { "eyes": "worry", "mouth": "smile" })
	T.look = R
	s.face(T, -0.3, 1.5, 36)
	await s.say("tobin", "It's dark, Reiner. They've hung you a dark one.", { "eyes": "half", "mouth": "smirk" })
	s.face(M, 0.3, 1.4, 34)
	M.look = lantern_pos(25)
	M.feel("half", "flat")
	await s.wait(1.6)
	s.face(A, 0.2, 1.6, 36)
	await s.say("aurel", "Dismissed. Walk, please. The stairs have feelings.", { "eyes": "soft", "mouth": "smile" })
	await s.fade(1.0, 0.8)
	# the High Table
	music("high")
	A.visible = false
	var stay: Array = ["nadi", "petra", "otto", "kas", "tobin", "maron", "bet", "ilse", "fenn", "joss"]
	for n in l: if not (n in stay) and n != "wim": act(n).visible = false
	ring(["petra", "otto", "nadi", "kas", "ilse", "joss", "fenn", "tobin"], Vector3(0.6, FY[0], -13.6), 3.1, 1.05, 2.95, null)
	R.place(Vector3(0.0, FY[0], -15.3), 0.3)
	at("wim", 0.95, -15.1, 0.2, FY[0])
	at("nadi", -1.0, -15.2, 0.4, FY[0])
	M = at("maron", -2.1, -18.4, 0.5, FY[0])
	at("bet", 3.6, -17.0, -0.6, FY[0])
	var Lu := at("lucan", 0.5, -7.2, PI, FY[0])
	var Do := at("dorn", 2.0, -6.8, PI, FY[0])
	var Si := at("sibyl", -0.7, -6.9, PI, FY[0])
	var led: Node3D = s.prop("ledger")
	Si.hold("L", led, Transform3D(Basis(Vector3.RIGHT, 1.2), Vector3(-0.1, -0.06, 0.12)))
	Do.hold("R", s.prop("trunk"), Transform3D(Basis(Vector3.UP, PI / 2), Vector3(0, -0.42, 0)))
	for n in ["petra", "otto", "kas", "ilse", "joss", "fenn", "tobin", "wim", "nadi"]: act(n).look = Lu
	R.look = Lu
	s.move(Vector3(0.4, 1.2, -12.6), Vector3(0.4, 1.5, -7.0), Vector3(0.4, 1.4, -13.4), Vector3(0.4, 1.5, -10), 4.4, 42)
	await s.fade(0.0, 0.7)
	Lu.go_free([Vector3(0.5, FY[0], -12.3)], 1.1)
	Do.go_free([Vector3(1.7, FY[0], -12.7)], 1.1)
	Si.go_free([Vector3(-0.8, FY[0], -12.1)], 1.1)
	await s.wait(2.6)
	s.cut(Vector3(-0.6, 1.6, -13.4), Vector3(-0.5, 1.45, -15.2), 44)
	await s.say("nadi", "That's the High Table. Top of the board. They don't queue, they don't keep curfew, and they don't say sorry.", { "eyes": "wide", "mouth": "flat" })
	await s.until(func(): return Lu.path.is_empty() and Do.path.is_empty(), 5.0)
	for p in [Lu, Do, Si]: p.face_yaw = PI
	Do.look = W
	var tk: Node3D = Do.drop("R")
	s.add_child(tk)
	a.keep(tk)
	tk.position = Vector3(1.45, FY[0], -13.6)
	s.main.sfx("clunk")
	s.two(Do, W, 1.0, 3.0, 40, 0.1)
	W.feel("wide", "wavy")
	await s.say("dorn", "You. Three floors up. Fetch.", { "eyes": "half", "mouth": "flat" })
	await s.say("wim", "That's... I've got... it's bigger than I am.", { "eyes": "worry", "mouth": "wavy", "do": "gulp" })
	s.face(R, -0.4, 1.4, 36)
	R.look = Do
	await s.say("reiner_uni", "Then carry it yourself.", { "eyes": "stern", "mouth": "flat" })
	s.main.sound.music("")
	s.main.sfx("gasp")
	for n in ["petra", "otto", "nadi", "kas", "tobin", "wim"]: act(n).feel("wide", "oh")
	s.cut(Vector3(-3.0, 1.7, -11.2), Vector3(0.8, 1.2, -14), 48)
	Do.turn_to(R)
	Do.look = R
	await s.wait(1.6)
	music("high")
	s.face(Lu, 0.25, 1.5, 34)
	Lu.look = R
	await s.say("lucan", "Dorn. He doesn't know.", { "eyes": "soft", "mouth": "smile" })
	await s.say("lucan", "You're the farm. Reiner, isn't it? I do like to know names.", { "eyes": "open", "mouth": "smile" })
	s.over(R, Lu, -1.0, 36)
	R.look = Lu
	await s.say("lucan", "It's only custom. Those above may ask a fetch of those below. It keeps things moving.", { "do": "offer2", "d": 2.0, "eyes": "soft", "mouth": "smile" })
	s.over(Lu, R, 1.0, 36)
	await s.say("reiner_uni", "And if you say no?", { "eyes": "open", "mouth": "flat" })
	s.face(Lu, -0.25, 1.4, 32)
	await s.say("lucan", "Then you say it properly. You call a wick: two candles, two mages. If yours is burning at the end of it, you may say no to anyone you like.", { "eyes": "half", "mouth": "smile" })
	Lu.look = lantern_pos(25)
	await s.wait(0.9)
	await s.say("lucan", "I'm told yours are shy.", { "eyes": "half", "mouth": "smirk" })
	s.cut(Vector3(3.4, 1.8, -11.4), Vector3(0.4, 1.2, -14.8), 46)
	for n in ["tobin", "joss", "ilse"]:
		act(n).feel("happy", "grin")
		act(n).do("laugh", 1.6)
	s.main.sfx("laugh", null, -8.0)
	await s.wait(1.5)
	s.face(Si, 0.3, 1.4, 34)
	Si.do("nod", 1.0)
	await s.say("sibyl", "One refusal. Noted.", { "eyes": "half", "mouth": "flat" })
	s.two(R, W, -1.0, 2.0, 38, 0.05)
	R.look = W
	W.feel("sad", "wavy")
	W.shiver = 1.0
	await s.wait(1.6)
	W.shiver = 0.0
	R.look = Lu
	await s.wait(0.3)
	s.face(R, 0.2, 1.4, 36)
	await s.say("reiner_uni", "I'll take it. His and mine.", { "eyes": "sad", "mouth": "flat" })
	s.face(Lu, 0.2, 1.4, 34)
	await s.say("lucan", "How generous. Sibyl, write down generous.", { "eyes": "soft", "mouth": "smile" })
	R.go_free([Vector3(0.85, FY[0], -14.2)], 1.2)
	s.cut(Vector3(-1.8, 1.2, -13.0), Vector3(1.0, 0.9, -13.9), 42)
	await s.wait(0.9)
	R.turn_to(tk)
	R.do("pickup", 1.4)
	await s.wait(0.7)
	s.remove_child(tk)
	R.hold("R", tk, Transform3D(Basis(Vector3.RIGHT, PI / 2), Vector3(0.12, -0.16, -0.14)))
	R.pose = "carry"
	R.feel("squeeze", "wavy")
	s.main.sfx("clunk")
	await s.wait(1.2)
	s.face(M, 0.35, 1.4, 32)
	M.look = R
	M.feel("half", "flat")
	await s.wait(1.2)
	M.do("flick", 1.0)
	s.cut(M.hand_pos("R") + Vector3(0.5, 0.12, 0.4), M.hand_pos("R"), 30)
	await s.wait(0.5)
	s.main.sfx("card")
	await s.wait(0.9)
	await s.fade(1.0, 1.0)
	drop(R, "R")
	drop(Si, "L")
	a._free_people()


# ==================================================================== 2 == --
func c2_fetches() -> void:
	s.go_place("academy")
	s.campus.chapter = 1
	music("school")
	s.main.sound.air("school")
	var R := reiner(0.6, -12.0, 0.0, FY[0])
	s.campus.open(16.4)
	board(25, false)
	s.busy = true
	s.play()
	s.hour_run = 0.45 / s.campus.HOUR_SECS
	await s.fade(0.0, 0.8)
	s.ui.place("Nine fetches a day")
	# Sibyl's book
	take(["sabine", "sibyl", "dorn", "bet"])
	clear(-4.5, 9.5, 1.8)
	clear(1.9, 30.6, 1.8)
	at("sabine", 7.4, -13.4, PI / 2, FY[1])
	var Si := at("sibyl", -4.46, 9.5, PI * 0.25)
	Si.sit(0.5, "sitread")
	Si.hold("L", s.prop("book_open"), Transform3D(Basis(Vector3.RIGHT, 0.5) * Basis(Vector3.UP, PI), Vector3(-0.1, -0.02, 0.08)))
	var Do := at("dorn", 1.9, 30.6, -2.4)
	Do.pose = "crossed"
	at("bet", 8.5, -7.6, -PI / 2, FY[0])
	s.ui.objective("Fetch Sibyl's book from the library, first floor, east")
	await a.use(Vector3(8.4, FY[1], -12.6), "Ask Sabine for the book", 1.9)
	s.locked = true
	var SB: Node3D = act("sabine")
	R.turn_to(SB)
	SB.look = R
	await s.say("sabine", "For the High Table. Of course. They've never once come up the stairs for one.", { "eyes": "half", "mouth": "flat", "auto": true })
	R.hold("R", s.prop("book"), Transform3D(Basis(Vector3.RIGHT, 1.4), Vector3(0, -0.1, 0.06)))
	s.main.sfx("catch")
	await s.say("sabine", "Two hands. It's older than your farm.", { "eyes": "open", "auto": true })
	s.locked = false
	s.ui.objective("Take it to Sibyl, on a bench by the fountain")
	# Bet, at the foot of the stairs
	await a.reach(Vector3(1.6, FY[0], -8.2), 3.2)
	s.film()
	R.path = []
	var B := at("bet", 3.0, -8.0, -PI / 2, FY[0])
	R.place(Vector3(0.9, FY[0], -8.0), PI / 2)
	var tr: Node3D = s.prop("tray")
	B.hold("R", tr, Transform3D(Basis(Vector3.RIGHT, PI / 2), Vector3(0.13, -0.12, 0.03)))
	B.pose = "carry"
	R.look = B
	B.look = R
	s.two(R, B, -1.0, 2.4, 40, 0.1)
	await s.say("bet", "You're taking the front way. With a High Table book. Do you want to be seen fetching?", { "eyes": "half", "mouth": "smirk" })
	s.over(B, R, 1.0, 38)
	await s.say("reiner_uni", "I didn't know there was a back way.", { "eyes": "worry", "mouth": "flat" })
	s.over(R, B, -1.0, 36)
	await s.say("bet", "There's always a back way. North door, round by the yard. Nobody important likes mud.", { "eyes": "open", "mouth": "grin" })
	await s.say("bet", "Bet Marl. Scholarship. I scrub what you eat off, and then I sit next to you in History.", { "eyes": "soft", "mouth": "smile" })
	s.face(R, -0.3, 1.4, 36)
	await s.say("reiner_uni", "Reiner. I'm last on the board.", { "eyes": "half", "mouth": "wavy" })
	s.face(B, 0.3, 1.4, 36)
	await s.say("bet", "I know. I'm third from last. We should put up curtains.", { "eyes": "happy", "mouth": "grin" })
	s.two(R, B, -1.0, 2.4, 40, 0.1)
	await s.say("bet", "Bit of advice from the docks. When they want a thing fetched, fetch it wrong. Slowly, and wrong.", { "eyes": "half", "mouth": "smirk", "do": "nod" })
	drop(B, "R")
	s.play()
	s.ui.objective("Take the book to Sibyl, on a bench by the fountain")
	await a.use(Vector3(-4.0, 0, 10.2), "Give Sibyl the book", 1.7)
	s.locked = true
	R.turn_to(Si)
	Si.look = R
	R.do("offer", 1.6)
	await s.say("sibyl", "This is volume two.", { "eyes": "half", "mouth": "flat", "auto": true })
	await s.say("reiner_uni", "You said volume two.", { "eyes": "worry", "mouth": "flat", "auto": true })
	await s.say("sibyl", "So I did. I wanted to see whether you'd look inside. You didn't. Noted.", { "eyes": "open", "mouth": "smirk", "auto": true })
	drop(R, "R")
	s.locked = false
	s.ui.objective("Dorn has left his gloves in the practice yard, west")
	await a.use(Vector3(-31.0, 0, -4.6), "Pick up the gloves", 2.0)
	s.locked = true
	R.do("pickup", 1.3)
	await s.wait(0.7)
	R.hold("R", s.prop("glove"), Transform3D(Basis(), Vector3(0, -0.2, 0.03)))
	await s.wait(0.5)
	s.locked = false
	s.ui.objective("Take them to Dorn, by the founder's statue")
	await a.use(Vector3(1.7, 0, 30.0), "Give Dorn his gloves", 1.9)
	s.locked = true
	R.turn_to(Do)
	Do.look = R
	R.do("offer", 1.6)
	await s.say("dorn", "These are both left.", { "eyes": "half", "mouth": "flat", "auto": true })
	await s.say("reiner_uni", "...They were the only ones there.", { "eyes": "worry", "mouth": "wavy", "auto": true })
	await s.say("dorn", "Huh. Then I've been wearing the wrong ones.", { "eyes": "open", "mouth": "flat", "auto": true })
	s.locked = false
	s.main.sfx("bell", null, -4.0)
	s.stage.ring_bell()
	s.campus._ring_wave()
	s.ui.bell_text("Supper Bell")
	await s.wait(1.0)
	s.locked = true
	await s.say("reiner_uni", "Supper bell? I was meant to meet Maron at four!", { "eyes": "wide", "mouth": "shout", "do": "flinch", "auto": true })
	s.locked = false
	s.ui.objective("Run! Maron is under the blossom tree, west of the fountain")
	await a.reach(Vector3(-11.6, 0, 8.4), 2.4)
	s.film()
	await s.fade(1.0, 0.6)
	drop(R, "R")
	drop(Si, "L")
	a._free_people()


# ==================================================================== 3 == --
func c3_late() -> void:
	open(18.9)
	s.film()
	music("evening")
	s.main.sound.air("night")
	take(["maron"])
	clear(-11, 8, 7)
	var M := at("maron", -12.0, 7.0, 0.5)
	M.pose = "groundread"
	M.hold("L", s.prop("book_open"), Transform3D(Basis(Vector3.RIGHT, 0.5) * Basis(Vector3.UP, PI), Vector3(-0.1, -0.02, 0.08)))
	var R := reiner(-6.4, 11.6, -2.2)
	R.hold("R", s.prop("glove"), Transform3D(Basis(), Vector3(0, -0.2, 0.03)))
	s.move(Vector3(-8.2, 1.2, 12.4), Vector3(-12, 1.2, 7), Vector3(-9.4, 1.1, 10.4), Vector3(-12, 0.9, 7), 4.0, 44)
	await s.fade(0.0, 0.8)
	R.go_free([Vector3(-10.4, 0, 8.6)], 3.4)
	await s.until(func(): return R.path.is_empty(), 5.0)
	R.turn_to(M)
	R.look = M
	R.do("cough", 1.6)
	await s.wait(0.8)
	s.two(M, R, -1.0, 2.8, 40, 0.1)
	await s.say("maron", "You said four.", { "eyes": "down", "mouth": "flat" })
	await s.say("reiner_uni", "I know.", { "eyes": "sad", "mouth": "wavy" })
	M.look = R
	drop(M, "L")
	M.pose = "ground"
	s.face(M, 0.3, 1.5, 36)
	await s.say("maron", "It's dark.", { "eyes": "half", "mouth": "flat" })
	s.face(R, -0.3, 1.5, 36)
	await s.say("reiner_uni", "I was helping. With some things.", { "eyes": "lookL", "mouth": "wavy", "do": "scratch" })
	s.face(M, 0.3, 1.5, 34)
	await s.say("maron", "You smell of other people's luggage.", { "eyes": "half", "mouth": "flat" })
	M.look = R.hand_pos("R")
	s.cut(R.hand_pos("R") + Vector3(sin(R.yaw), 0, cos(R.yaw)) * 0.75 + Vector3(0, 0.22, 0), R.hand_pos("R"), 34)
	await s.say("maron", "And that isn't yours.")
	s.over(M, R, 1.0, 38)
	await s.say("reiner_uni", "It's only custom.", { "eyes": "down", "mouth": "flat" })
	s.face(M, -0.2, 1.4, 34)
	M.look = R
	await s.say("maron", "So is drowning, in some rivers.", { "eyes": "stern", "mouth": "flat" })
	await s.wait(0.6)
	M.stand()
	await s.wait(0.5)
	s.face(M, -0.2, 1.4, 36)
	await s.say("maron", "Sit. Light it.", { "eyes": "half", "mouth": "flat" })
	var cp := Vector3(-11.2, 0.0, 7.9)
	var C: Node3D = a.keep(s.put("candle", cp))
	drop(R, "R")
	R.place(Vector3(-10.5, 0, 8.3), -2.0)
	R.pose = "kneel"
	M.place(Vector3(-11.9, 0, 7.1), 0.75)
	M.pose = "kneel"
	R.look = C
	M.look = C
	s.cut(Vector3(-9.6, 1.0, 6.6), Vector3(-11.2, 0.75, 7.7), 42)
	await s.cast([["Wake", "U"], ["small", "L"], ["one", "R"], ["and", "D"], ["see", "U"]], { "gap": 0.95, "wide": 0.32, "name": "Wake, small one, and see" })
	s.main.sfx("ignite")
	var f := flame(cp + Vector3(0, 0.285, 0), 0.75)
	R.feel("soft", "smile")
	await s.wait(1.2)
	s.face(M, -0.2, 1.2, 34)
	M.feel("soft", "smile")
	await s.say("maron", "Better. It hardly sulked.")
	# and she blows it out
	s.cut(Vector3(-10.3, 0.75, 6.9), cp + Vector3(0, 0.35, 0), 36)
	M.do("cough", 0.8)
	await s.wait(0.35)
	douse(f)
	R.feel("wide", "oh")
	await s.say("reiner_uni", "Hey!", { "eyes": "wide", "mouth": "shout" })
	s.over(R, M, 1.0, 36)
	await s.say("maron", "That's all they'll do, whoever they are. Lighting it is asking. Now ask it to stay.", { "eyes": "half", "mouth": "flat" })
	s.face(R, 0.2, 1.3, 36)
	await s.say("reiner_uni", "How?", { "eyes": "worry", "mouth": "flat" })
	s.face(M, -0.2, 1.3, 34)
	await s.say("maron", "How do you keep anybody? Stand between it and the wind, and mean it.", { "eyes": "open", "mouth": "flat" })
	s.ui.toast("Blue: shelter your flame from a breath.   Gold: call it higher.")
	s.cut(Vector3(-9.4, 1.0, 7.0), Vector3(-11.1, 0.7, 7.8), 40)
	s.main.sfx("ignite")
	f = flame(cp + Vector3(0, 0.285, 0), 0.75)
	var foe := { "k": 0.0 }
	await s.duel([["Stay", "D", "c"], ["breath", "L", "g"], ["small", "U", "c"], ["breath", "R", "g"], ["one", "U", "c"], ["breath", "L", "g"], ["though", "D", "c"], ["breath", "R", "g"], ["it's cold", "U", "c"]], { "gap": 0.95, "wide": 0.32, "name": "Stay, small one, though it's cold", "name_foe": "Maron", "you": 0.6, "foe": 0.9, "hurt": 0.14, "floor_you": 0.1, "floor_foe": 0.9, "fy": f, "gust": func(_ok): M.do("cough", 0.5) })
	s.cut(cp + Vector3(0.6, 0.45, -0.5), cp + Vector3(0, 0.3, 0), 30)
	await s.wait(1.0)
	douse(f)
	await s.say("maron", "Out. But you made me work for it.", { "eyes": "soft", "mouth": "smile" })
	await s.wait(0.7)
	# the ember comes back
	s.main.sfx("chime", null, -10.0)
	f = flame(cp + Vector3(0, 0.285, 0), 0.75)
	f.k = 0.05
	var t0: float = s.time
	while s.time < t0 + 1.4:
		f.k = lerpf(0.05, 0.55, smoothstep(0.0, 1.0, (s.time - t0) / 1.4))
		await s.beat()
	s.face(M, -0.2, 1.2, 32)
	M.feel("wide", "small")
	await s.wait(1.2)
	await s.say("maron", "...Did you do that?", { "eyes": "wide", "mouth": "small" })
	s.face(R, 0.2, 1.3, 36)
	await s.say("reiner_uni", "Do what?", { "eyes": "open", "mouth": "flat" })
	s.face(M, -0.2, 1.2, 32)
	await s.say("maron", "Nothing.", { "eyes": "lookL", "mouth": "flat" })
	await s.wait(0.6)
	s.two(M, R, -1.0, 2.6, 40, 0.1)
	M.stand()
	R.stand()
	M.look = R
	R.look = M
	await s.say("maron", "Whose glove is it?", { "eyes": "half", "mouth": "flat" })
	R.feel("down", "flat")
	await s.wait(1.2)
	M.do("offer", 2.0)
	await s.say("maron", "Never mind. Give it here. I'll see it gets back to him.", { "eyes": "soft", "mouth": "smirk" })
	await s.fade(1.0, 1.0)
	a._free_people()


# ==================================================================== 4 == --
func c4_love() -> void:
	open(23.4)
	s.film()
	music("night")
	s.main.sound.air("night")
	s.hero = null
	for p in s.campus.people: p.busy = true
	for p in s.campus.people: p.a.visible = false
	for n in ["reiner_uni"]: s.leave(n)
	var hats: Array = []
	s.indoor_auto = false
	s.indoor_to = 0.85
	s.indoor = 0.85
	# the hall by night
	s.move(Vector3(-1.5, 2.6, -8.0), Vector3(3, 1.6, -15), Vector3(-0.4, 2.2, -9.4), Vector3(4, 1.6, -15), 4.0, 50)
	await s.fade(0.0, 1.2)
	await s.wait(1.6)
	var tt := tt_at(Vector3(-0.6, FY[0], -18.2), PI / 2, true)
	s.main.fx.card_puff(tt.position + Vector3(0, 0.9, 0), 12)
	s.main.sfx("card")
	s.cut(Vector3(2.4, 0.7, -16.6), Vector3(-0.6, 1.3, -18.2), 40)
	await s.wait(1.2)
	tt.play("spin")
	await s.wait(1.5)
	# hats
	s.cut(Vector3(-1.2, 5.6, -17.6), Vector3(0, 5.5, -20.1), 50)
	await s.wait(0.5)
	for x in [-1.6, 1.6]:
		var h: Node3D = a.keep(s.put("tophat", Vector3(x, FY[1] + 1.35 + 0.8, -19.98), 0.0, 1.1))
		hats.append(h)
		s.main.fx.card_puff(h.position, 6)
		s.main.sfx("card")
		await s.wait(0.6)
	s.indoor_to = 0.0
	s.indoor = 0.0
	tt_gone()
	var fh: Node3D = a.keep(s.put("tophat", Vector3(0.02, 2.68, 29.0), 0.3, 1.25))
	fh.visible = false
	tt = tt_at(Vector3(1.5, 0, 30.6), PI + 0.6, false)
	s.cut(Vector3(2.8, 1.2, 33.0), Vector3(0.6, 1.9, 29.4), 44)
	await s.wait(0.7)
	tt.play("curtsy")
	await s.wait(1.2)
	fh.visible = true
	s.main.fx.card_puff(Vector3(0, 2.7, 29.0), 8)
	s.main.sfx("card")
	await s.wait(1.2)
	tt_gone()
	s.indoor_to = 0.85
	s.indoor = 0.85
	var top: Vector3 = lantern_pos(0)
	s.cut(top + Vector3(-1.4, 0.0, 0.4), top + Vector3(0, 0.1, 0), 34)
	await s.wait(0.8)
	var tu: Node3D = a.keep(s.put("turnip", top + Vector3(-0.03, -0.02, 0), -PI / 2, 1.35))
	s.stage.by_name["bl_0"].visible = false
	lit(0, false)
	s.main.fx.card_puff(tu.position, 10)
	s.main.sfx("card")
	await s.wait(1.8)
	await s.fade(1.0, 0.8)
	# the morning
	s.indoor_auto = true
	s.hour = 8.3
	music("lesson")
	s.main.sound.air("room")
	take(PUP + ["lucan", "dorn", "sibyl", "aurel"])
	clear(0, -13, 10)
	var order: Array = ["nadi", "petra", "otto", "wim", "kas", "bet", "tobin", "isolde", "ilse", "rowan", "fenn", "joss", "selma", "marta", "orin"]
	for n in PUP: act(n).visible = false
	hall_crowd(order, top)
	var R := reiner(2.5, -16.9, PI / 2, FY[0])
	var M := at("maron", 1.5, -17.5, PI / 2, FY[0])
	R.look = top
	M.look = top
	M.hold("R", s.prop("bun"), Transform3D(Basis(), Vector3(0, -0.07, 0.05)))
	var Lu := at("lucan", 3.4, -12.0, PI / 2 + 0.4, FY[0])
	var Do := at("dorn", 3.2, -10.9, PI / 2 + 0.4, FY[0])
	var Si := at("sibyl", 2.6, -9.4, PI / 2 + 0.5, FY[0])
	for p in [Lu, Do, Si]: p.look = top
	s.cut(Vector3(-2.4, 2.6, -9.4), Vector3(4, 1.7, -14.8), 52)
	s.main.sfx("bell", null, -6.0)
	await s.fade(0.0, 0.8)
	await s.wait(1.4)
	s.cut(top + Vector3(-1.2, 0.1, 0.3), top + Vector3(0, 0.1, 0), 32)
	await s.wait(1.6)
	s.face(Lu, 0.3, 1.5, 34)
	Lu.feel("open", "flat")
	await s.wait(1.4)
	var P: Node3D = act("petra")
	s.face(P, 0.3, 1.4, 36)
	P.feel("squeeze", "wavy")
	P.shiver = 1.0
	await s.wait(1.0)
	P.shiver = 0.0
	P.feel("happy", "shout")
	P.do("laugh", 2.4)
	s.main.sfx("laugh")
	await s.wait(0.5)
	s.cut(Vector3(4.6, 1.9, -10.0), Vector3(1.6, 1.2, -13.6), 52)
	for n in order:
		if n in ["isolde", "selma"]: continue
		act(n).feel("happy", "grin")
		act(n).do("laugh", 2.6)
	await s.wait(2.2)
	var N: Node3D = act("nadi")
	card(N, "R", "heart")
	N.do("offer", 2.4)
	s.face(N, -0.5, 1.2, 38)
	await s.say("nadi", "There's a card! \"To the gentleman at the top: a light snack. With love.\"", { "eyes": "wide", "mouth": "grin" })
	s.face(Si, 0.3, 1.5, 34)
	var gl: Node3D = s.prop("glove")
	Si.hold("R", gl, Transform3D(Basis(), Vector3(0, -0.2, 0.03)))
	await s.say("sibyl", "It was pinned up with this. Yours, I think, Dorn. It's been stuffed with jam.", { "eyes": "half", "mouth": "frown" })
	s.face(Lu, -0.2, 1.4, 32)
	await s.wait(0.6)
	Lu.feel("soft", "smile")
	await s.say("lucan", "How festive.", { "eyes": "soft", "mouth": "smile" })
	s.cut(Lu.hand_pos("R") + Vector3(0.1, 0.1, 0.6), Lu.hand_pos("R"), 32)
	Lu.hand.R = "fist"
	Lu.shiver = 0.5
	await s.wait(1.4)
	Lu.shiver = 0.0
	s.two(R, M, 1.0, 2.0, 38, 0.05)
	R.look = M
	M.feel("half", "flat")
	await s.wait(1.0)
	M.look = R
	await s.say("maron", "What?", { "eyes": "open", "mouth": "flat" })
	await s.say("reiner_uni", "Nothing. There's a hat on Orlind, too.", { "eyes": "worry", "mouth": "smile" })
	s.face(M, -0.3, 1.3, 34)
	await s.say("maron", "I saw. It suits him.", { "eyes": "lookL", "mouth": "smirk" })
	var A := at("aurel", -4.25, -13.6, PI / 2, FY[0] + 1.4)
	A.stage = null
	A.look = top
	s.face(A, 0.2, 1.5, 36)
	A.feel("soft", "wavy")
	await s.wait(1.3)
	await s.say("aurel", "Take it down. ...After dinner.", { "eyes": "soft", "mouth": "smile" })
	A.stage = s.stage
	await s.fade(1.0, 1.0)
	drop(M, "R")
	drop(N, "R")
	drop(Si, "R")
	Lu.hand.R = ""
	board(25, false)
	a._free_people()


# ==================================================================== 5 == --
func c5_proctor() -> void:
	open(12.2)
	s.film()
	music("high")
	s.main.sound.air("room")
	var tabs: Array = PUP + ["lucan", "dorn", "sibyl"]
	take(tabs + ["aurel", "vane", "dorle"])
	# seats at the refectory's tables, two between; the High Table's is the far one
	var D: Array = [["reiner_uni", 11.3, -11.7, PI], ["wim", 12.25, -11.7, PI], ["bet", 13.2, -11.7, PI], ["maron", 14.15, -11.7, PI], ["otto", 15.1, -11.7, PI], ["nadi", 11.3, -13.1, 0.0], ["petra", 12.25, -13.1, 0.0], ["kas", 13.2, -13.1, 0.0], ["tobin", 14.15, -13.1, 0.0], ["isolde", 15.1, -13.1, 0.0],
		["ilse", 11.3, -14.5, PI], ["rowan", 12.25, -14.5, PI], ["marta", 13.2, -14.5, PI], ["fenn", 14.15, -14.5, PI], ["joss", 15.1, -14.5, PI], ["yve", 12.25, -15.9, 0.0], ["bram", 13.2, -15.9, 0.0], ["sunniva", 14.15, -15.9, 0.0], ["cato", 15.1, -15.9, 0.0],
		["lucan", 13.2, -18.7, 0.0], ["dorn", 14.15, -18.7, 0.0], ["sibyl", 12.25, -18.7, 0.0]]
	for n in tabs: act(n).visible = false
	clear(13, -14, 8)
	var R := reiner(11.3, -11.7, PI, FY[0])
	for d in D:
		var p: Node3D = R if d[0] == "reiner_uni" else at(d[0], d[1], d[2], d[3], FY[0])
		p.sit(0.46, "eat" if d[0] != "reiner_uni" else "sit")
		p.lod = 0 if float(d[2]) > -13.4 else 1
	var M: Node3D = act("maron")
	var V := at("vane", 7.8, -10.0, PI / 2, FY[0])
	var A := at("aurel", 7.8, -8.4, PI / 2, FY[0])
	V.visible = false
	s.move(Vector3(17.6, 2.3, -10.2), Vector3(12, 1.0, -15), Vector3(16.6, 2.0, -10.4), Vector3(12, 1.0, -14), 4.0, 54)
	await s.fade(0.0, 0.8)
	await s.wait(1.6)
	s.main.sound.music("")
	s.main.sfx("door_shut")
	V.visible = true
	V.place(Vector3(8.5, FY[0], -9.9), PI)
	for d in D:
		var p: Node3D = act(d[0])
		p.look = V
		if p.pose == "eat": p.pose = "sit"
	s.cut(Vector3(11.4, 1.5, -13.0), V.head_pos(), 40)
	await s.wait(1.4)
	music("high")
	A.place(Vector3(10.4, FY[0], -10.6), PI)
	A.look = V
	V.look = A
	s.two(A, V, 1.0, 2.6, 40, 0.1)
	await s.say("aurel", "This is Proctor Vane. The governors have sent him to find out who has been putting hats on things.", { "eyes": "half", "mouth": "flat" })
	V.look = null
	s.face(V, 0.2, 1.5, 34)
	await s.say("vane", "I have caught poachers, forgers, and a bishop. I shall not be long.", { "eyes": "half", "mouth": "flat" })
	A.place(Vector3(6.9, FY[0], -11.5), PI / 2)
	A.look = V
	V.go_free([Vector3(8.7, FY[0], -11.0), Vector3(10.2, FY[0], -11.15), Vector3(11.3, FY[0], -10.75)], 1.4)
	s.cut(Vector3(14.6, 1.6, -10.3), Vector3(11.4, 1.2, -11.4), 46)
	await s.say("vane", "Pockets. Satchels. Books. On the table.", { "eyes": "stern", "mouth": "flat" })
	await s.until(func(): return V.path.is_empty(), 4.0)
	V.face_yaw = PI
	V.look = R
	R.look = V
	R.feel("worry", "wavy")
	var bk: Node3D = a.keep(s.put("book", Vector3(11.3, FY[0] + 0.744, -12.2), 0.2))
	var c: Node3D = (load("res://assets/cards.glb") as PackedScene).instantiate()
	s.main.voxelize(c)
	for q in c.get_children(): q.visible = String(q.name).contains("heart")
	s.add_child(c)
	a.keep(c)
	s.main.sfx("card")
	var t0: float = s.time
	s.cut(Vector3(12.3, 1.35, -11.1), Vector3(11.3, 0.8, -12.1), 34)
	while s.time < t0 + 0.9:
		var u: float = (s.time - t0) / 0.9
		c.position = Vector3(11.3 + sin(u * 9.0) * 0.08, FY[0] + 1.15 - u * 0.37, -12.0)
		c.rotation = Vector3(-PI / 2 * u, u * 4.0, 0)
		await s.beat()
	s.main.sfx("gasp")
	await s.wait(0.8)
	s.over(R, V, 1.0, 36)
	await s.say("vane", "Explain.", { "eyes": "stern", "mouth": "flat" })
	seat_face(R, 1.2, 42)
	await s.say("reiner_uni", "It's a bookmark. It was just... there.", { "eyes": "worry", "mouth": "wavy" })
	s.face(V, -0.2, 1.5, 34)
	await s.say("vane", "It is always just there.", { "eyes": "half", "mouth": "flat" })
	var Lu: Node3D = act("lucan")
	Lu.stand()
	Lu.look = V
	await s.wait(0.5)
	s.face(Lu, 0.0, 1.5, 36)
	await s.say("lucan", "Proctor, I'll vouch for him. He fetches for me. He hasn't the time.", { "eyes": "soft", "mouth": "smile" })
	V.look = Lu
	Lu.place(Vector3(10.1, FY[0], -16.6), PI / 4)
	Lu.go_free([Vector3(9.9, FY[0], -13.6), Vector3(10.2, FY[0], -11.4)], 1.5)
	s.cut(Vector3(8.4, 1.6, -12.8), Vector3(10.8, 1.3, -11.6), 44)
	await s.until(func(): return Lu.path.is_empty(), 5.0)
	Lu.turn_to(R)
	Lu.look = R
	R.look = Lu
	s.face(Lu, 0.2, 1.3, 34)
	await s.say("lucan", "That's one. I'll think of something you can do for it.", { "eyes": "half", "mouth": "smile" })
	seat_face(R, 1.2, 42)
	await s.say("reiner_uni", "I didn't ask you to.", { "eyes": "stern", "mouth": "flat" })
	s.face(Lu, 0.2, 1.3, 34)
	await s.say("lucan", "No. That's what makes it expensive.", { "eyes": "soft", "mouth": "smirk" })
	await s.wait(0.5)
	# the whole room has one
	music("lesson")
	seat_face(M, 1.2, 40)
	M.look = V
	V.look = M
	card(M, "R", "diamond")
	M.do("offer", 2.6)
	await s.say("maron", "I've one too. It was on my pillow.", { "eyes": "open", "mouth": "flat" })
	var B: Node3D = act("bet")
	card(B, "R", "club")
	B.do("offer", 2.6)
	seat_face(B, 1.2, 40)
	await s.say("bet", "And me. In my shoe.", { "eyes": "open", "mouth": "grin" })
	var W: Node3D = act("wim")
	card(W, "R", "club")
	W.do("offer", 2.6)
	seat_face(W, 1.2, 40)
	await s.say("wim", "I've got a four of clubs. Is that good?", { "eyes": "worry", "mouth": "smile" })
	s.move(Vector3(16.8, 2.2, -10.2), Vector3(12.6, 1.0, -13), Vector3(15.8, 2.5, -9.9), Vector3(12.6, 1.0, -13.4), 4.0, 54)
	for n in ["otto", "nadi", "petra", "kas", "ilse", "rowan", "marta", "fenn", "joss", "isolde"]:
		card(act(n), "R", ["heart", "spade", "diamond", "club"][randi() % 4])
		act(n).do("offer", 3.4)
		s.main.sfx("card", null, -6.0)
		await s.wait(0.24)
	await s.wait(1.0)
	s.face(V, 0.2, 1.4, 34)
	V.feel("shut", "flat")
	await s.say("vane", "...Everyone.", { "eyes": "shut", "mouth": "flat" })
	s.face(A, -0.2, 1.4, 36)
	A.feel("soft", "smile")
	await s.say("aurel", "Do sit down, Proctor. There's dumplings.", { "eyes": "soft", "mouth": "smile" })
	s.two(R, act("wim"), 1.0, 2.0, 40, 0.1)
	R.look = M
	R.feel("wide", "flat")
	await s.wait(1.0)
	seat_face(M, 1.2, 38)
	M.look = null
	drop(M, "R")
	M.pose = "eat"
	M.feel("half", "smirk")
	await s.wait(1.6)
	await s.fade(1.0, 0.9)
	for n in PUP: drop(act(n), "R")
	a._free_people()


# ==================================================================== 6 == --
func c6_wicks() -> void:
	open(15.3)
	s.film()
	music("school")
	take(["corvin", "otto", "kas", "wim", "bet", "isolde", "tobin", "petra", "nadi", "maron"])
	clear(-33, -8, 13)
	var R := reiner(-33.4, -9.6, 0.0)
	var O := at("otto", -33.4, -6.6, PI)
	var C := at("corvin", -31.4, -11.2, -0.6)
	ring(["petra", "wim", "kas", "nadi"], Vector3(-33.4, 0, -8.1), 4.0, -2.4, -0.7, null)
	at("bet", -36.4, -5.0, 2.0)
	var I := at("isolde", -33.6, -13.6, 0.0)
	var T := at("tobin", -33.6, -11.9, PI)
	var M := at("maron", -27.0, -4.0, -2.2)
	M.pose = "read"
	M.hold("L", s.prop("book_open"), Transform3D(Basis(Vector3.RIGHT, 0.5) * Basis(Vector3.UP, PI), Vector3(-0.1, -0.02, 0.08)))
	var sp := duel_stands(Vector3(-33.4, 0, -8.75), Vector3(-33.4, 0, -7.45))
	R.look = C
	O.look = C
	s.move(Vector3(-28.4, 2.2, -3.0), Vector3(-33.4, 1.0, -8.6), Vector3(-29.6, 1.8, -4.6), Vector3(-33.4, 1.1, -8.4), 4.0, 46)
	await s.fade(0.0, 0.8)
	await s.say("corvin", "Wicks. Oldest quarrel there is, and the politest. Two candles. You keep yours. You don't touch theirs but with breath.", { "eyes": "open", "mouth": "flat", "do": "offer2", "d": 2.4 })
	s.face(C, 0.3, 1.6, 36)
	await s.say("corvin", "When the wind's coming, shelter. When it isn't, call your flame up. When they've stopped minding theirs, breathe.", { "eyes": "half", "do": "pointup", "d": 2.4 })
	s.cut(Vector3(-31.2, 1.5, -10.6), Vector3(-33.4, 1.2, -13.0), 42)
	I.look = T
	T.look = I
	T.do("castbig", 1.2)
	s.main.sfx("gust")
	await s.wait(1.2)
	I.do("flick", 0.8)
	await s.wait(0.4)
	s.main.sfx("wick_out")
	T.feel("wide", "oh")
	T.do("flinch", 0.9)
	await s.say("isolde", "You looked at it. It saw you looking.", { "eyes": "half", "mouth": "flat" })
	s.two(R, O, 1.0, 3.4, 40, 0.0)
	R.look = O
	O.look = R
	await s.say("otto", "I'll go easy. I've had pudding.", { "eyes": "happy", "mouth": "grin" })
	s.main.sfx("ignite")
	var fy := flame(sp[0], 0.85)
	var ff := flame(sp[1], 0.85)
	R.pose = "cast"
	O.pose = "cast"
	s.ui.toast("Blue: shelter.   Gold: call your flame.   Rose: breathe on theirs.")
	s.cut(Vector3(-30.2, 1.7, -8.1), Vector3(-33.4, 1.25, -8.1), 46)
	var r: Dictionary = await s.duel([["shelter", "L", "g"], ["rise", "U", "c"], ["shelter", "R", "g"], ["rise", "U", "c"], ["breathe", "D", "b"], ["shelter", "L", "g"], ["rise", "U", "c"], ["breathe", "D", "b"], ["shelter", "R", "g"], ["breathe", "D", "b"], ["rise", "U", "c"], ["breathe", "D", "b"]], { "gap": 0.86, "wide": 0.3, "name": "A practice wick", "name_foe": "Otto", "you": 0.6, "foe": 0.62, "hurt": 0.14, "push": 0.14, "floor_you": 0.08, "fy": fy, "ff": ff, "gust": func(_ok): O.do("castdo", 0.6) })
	R.pose = "stand"
	O.pose = "stand"
	if r.foe < r.you:
		douse(ff)
		s.main.sfx("cheer", null, -8.0)
		R.feel("wide", "grin")
		await s.say("otto", "Oh! It's gone. I was thinking about the pudding.", { "eyes": "wide", "mouth": "oh" })
	else:
		douse(fy)
		await s.say("otto", "Sorry! I only sneezed!", { "eyes": "worry", "mouth": "oh" })
	s.two(C, R, 1.0, 2.8, 40, 0.1)
	C.look = R
	R.look = C
	await s.say("corvin", "Your feet were good. Do you know what you did with your hand?", { "eyes": "half", "mouth": "flat" })
	await s.say("reiner_uni", "I put it round the flame. So it wouldn't be cold.", { "eyes": "open", "mouth": "flat" })
	s.face(C, 0.2, 1.5, 34)
	await s.wait(0.8)
	await s.say("corvin", "Forty years. Nobody's ever told me it was cold.", { "eyes": "soft", "mouth": "flat" })
	await s.fade(1.0, 0.8)
	drop(M, "L")
	a._free_people()


# ==================================================================== 7 == --
func c7_first() -> void:
	open(16.5)
	s.film()
	music("school")
	var on: Array = ["petra", "nadi", "otto", "bet", "ilse", "joss", "fenn", "rowan"]
	take(on + ["kas", "dorn", "lucan", "sibyl", "tobin", "isolde", "corvin", "maron", "wim"])
	for n in on: act(n).visible = false
	clear(0.5, 22, 9)
	var K := at("kas", 1.2, 22.4, PI)
	var pot: Node3D = a.keep(s.put("sprout", Vector3(1.2, 0, 21.6)))
	K.pose = "crouch"
	K.look = pot
	var R := reiner(-0.6, 21.4, PI / 2)
	R.look = pot
	var W := at("wim", -0.8, 22.6, PI / 2 + 0.4)
	W.look = pot
	s.move(Vector3(4.4, 1.6, 24.2), Vector3(0.7, 0.8, 21.9), Vector3(3.6, 1.4, 23.8), Vector3(0.7, 0.75, 21.9), 5.0, 42)
	await s.fade(0.0, 0.8)
	await s.say("kas", "It opened at noon. I've been humming to it since the holidays. I think it's going to be a bell.", { "eyes": "happy", "mouth": "smile" })
	s.face(R, 0.2, 1.4, 38)
	await s.say("reiner_uni", "What does it ring for?", { "eyes": "soft", "mouth": "smile" })
	s.cut(Vector3(2.7, 0.8, 23.2), pot.position + Vector3(0, 0.3, 0), 34)
	await s.say("kas", "I haven't liked to ask.", { "eyes": "soft" })
	var Do := at("dorn", 1.6, 12.6, 0.0)
	var T := at("tobin", 2.6, 12.0, 0.0)
	Do.place(Vector3(4.6, 0, 18.4), -0.8)
	T.place(Vector3(5.6, 0, 17.6), -0.8)
	music("high")
	Do.go_free([Vector3(2.0, 0, 20.4), Vector3(1.25, 0, 20.9)], 1.5)
	T.go_free([Vector3(3.2, 0, 19.8)], 1.5)
	s.cut(Vector3(-2.6, 1.6, 24.4), Vector3(2.0, 1.05, 20.6), 44)
	await s.until(func(): return Do.path.is_empty(), 5.0)
	# the pot
	pot.visible = false
	var sm: Node3D = a.keep(s.put("sprout_flat", Vector3(1.2, 0, 21.6)))
	s.main.sfx("clunk")
	s.burst(Vector3(1.2, 0.2, 21.6), Color("b0603c"), Color("4a3424"), 16, 1.6, -6.0, 0.03, 0.7)
	s.cut(Vector3(2.6, 0.5, 22.8), Vector3(1.2, 0.1, 21.6), 34)
	await s.wait(1.4)
	K.feel("sad", "flat")
	Do.look = sm
	s.face(Do, 0.2, 1.6, 36)
	await s.say("dorn", "It was in the way.", { "eyes": "half", "mouth": "flat" })
	s.face(K, 0.3, 1.2, 36)
	K.pose = "kneel"
	K.look = sm
	K.feel("sad", "wavy")
	await s.wait(1.6)
	s.face(R, 0.2, 1.3, 34)
	R.look = Do
	R.feel("stern", "flat")
	await s.say("reiner_uni", "Pick it up.", { "eyes": "stern", "mouth": "flat" })
	s.over(R, Do, 1.0, 38)
	await s.say("dorn", "No.", { "eyes": "half", "mouth": "flat" })
	s.face(R, 0.2, 1.2, 32)
	await s.say("reiner_uni", "Then I call it. You and me. A wick.", { "eyes": "stern", "mouth": "flat" })
	s.main.sound.music("")
	s.main.sfx("gasp")
	ring(on, Vector3(0.4, 0, 24.6), 4.2, -2.3, 1.3, R)
	var Lu := at("lucan", 4.7, 20.8, -1.1)
	var Si := at("sibyl", 5.5, 21.8, -1.2)
	Lu.look = R
	s.cut(Vector3(-3.6, 1.9, 18.4), Vector3(1.4, 1.1, 22.4), 50)
	await s.wait(1.3)
	music("high")
	s.face(Lu, 0.2, 1.5, 34)
	await s.say("lucan", "Here? Now? ...By all means. Sibyl, two candles.", { "eyes": "soft", "mouth": "smile" })
	await s.fade(1.0, 0.5)
	var c0 := Vector3(0.4, 0, 24.6)
	var sp := duel_stands(Vector3(-0.35, 0, 24.6), Vector3(1.15, 0, 24.6))
	R.place(Vector3(-1.05, 0, 24.6), PI / 2)
	Do.place(Vector3(1.9, 0, 24.6), -PI / 2)
	K.place(Vector3(-2.6, 0, 23.0), PI / 2)
	W.place(Vector3(-2.7, 0, 24.4), PI / 2)
	ring(on, c0, 4.2, -1.0, 1.9, R)
	Lu.place(Vector3(3.4, 0, 22.4), -0.9)
	Si.place(Vector3(4.2, 0, 23.4), -1.1)
	T.place(Vector3(4.3, 0, 24.8), -PI / 2)
	var I := at("isolde", -1.6, 20.6, 0.4)
	var C := at("corvin", -5.0, 20.0, 0.8)
	var M := at("maron", 4.9, 18.4, -PI * 0.78)
	M.sit(0.5, "sit")
	for n in ["kas", "wim", "lucan", "sibyl", "tobin", "isolde", "corvin", "maron"]: act(n).look = R
	R.look = Do
	Do.look = R
	K.feel("worry", "flat")
	W.feel("worry", "wavy")
	var fy := flame(sp[0], 0.85)
	var ff := flame(sp[1], 0.95)
	s.cut(c0 + Vector3(0, 1.8, 3.4), c0 + Vector3(0, 1.25, 0), 44)
	await s.fade(0.0, 0.5)
	music("duel")
	await s.say("dorn", "Ready.", { "eyes": "half", "mouth": "flat" })
	R.pose = "cast"
	Do.pose = "cast"
	await s.duel([["shelter", "L", "g"], ["rise", "U", "c"], ["shelter", "R", "g"], ["shelter", "L", "g"], ["shelter", "D", "g"], ["shelter", "R", "g"], ["shelter", "U", "g"], ["shelter", "L", "g"], ["shelter", "D", "g"], ["shelter", "R", "g"]], { "gap": 0.46, "wide": 0.17, "name": "Dorn's breath is like a door opening", "name_foe": "Dorn", "you": 0.5, "foe": 1.0, "hurt": 0.28, "floor_foe": 0.9, "fy": fy, "ff": ff, "gust": func(_ok): Do.do("castdo", 0.5) })
	Do.do("castbig", 1.0)
	s.main.sfx("whoosh")
	s.shake = 0.6
	s.burst(sp[0], Color("d8d0c0"), Color("b0a692"), 20, 2.4, -2.0, 0.03, 0.6)
	await s.wait(0.4)
	douse(fy)
	R.pose = "stand"
	R.do("fall", 2.4)
	s.main.sound.music("")
	s.cut(sp[0] + Vector3(-0.6, 0.25, 0.7), sp[0] + Vector3(0, -0.05, 0), 32)
	await s.wait(1.8)
	s.face(Do, 0.2, 1.6, 36)
	await s.say("dorn", "That's it?", { "eyes": "open", "mouth": "flat" })
	s.face(Si, 0.2, 1.4, 34)
	await s.say("sibyl", "Loser's lantern is turned to the wall. Until further notice.", { "eyes": "half", "mouth": "flat" })
	s.face(Lu, -0.2, 1.4, 34)
	await s.say("lucan", "It was well meant, Reiner. That's rather the trouble with it.", { "eyes": "soft", "mouth": "smile" })
	Lu.go_free([Vector3(7.5, 0, 21.4), Vector3(11, 0, 18)], 1.3)
	Si.go_free([Vector3(8.5, 0, 22.6), Vector3(12, 0, 19.4)], 1.3)
	Do.go_free([Vector3(5.4, 0, 22.2), Vector3(10.4, 0, 20.4)], 1.3)
	T.go_free([Vector3(9.4, 0, 23.6)], 1.3)
	s.cut(Vector3(-4.2, 2.0, 27.6), Vector3(0.8, 1.0, 23.6), 46)
	for i in on.size(): act(on[i]).go_free([Vector3(8.0 + (i % 3) * 1.2, 0, 27 + (i / 3) * 1.6)], 1.4)
	await s.wait(2.2)
	music("evening")
	R.feel("down", "frown")
	K.go_free([Vector3(-1.5, 0, 23.4)], 1.1)
	await s.until(func(): return K.path.is_empty(), 4.0)
	K.turn_to(R)
	K.look = R
	R.look = K
	s.two(R, K, 1.0, 2.6, 38, 0.1)
	await s.say("kas", "You said no. I've been here a year, and nobody's said no.", { "eyes": "soft", "mouth": "flat" })
	await s.say("reiner_uni", "It didn't do any good.", { "eyes": "sad", "mouth": "frown" })
	K.do("offer", 2.2)
	await s.say("kas", "One leaf's all right. I'll start from that.", { "eyes": "soft", "mouth": "smile" })
	await s.fade(1.0, 0.6)
	# and when nobody's there
	for n in ["kas", "wim", "reiner_uni"]: act(n).visible = false
	for n in on: act(n).visible = false
	s.cut(sp[0] + Vector3(-0.55, 0.2, 0.6), sp[0] + Vector3(0, 0.0, 0), 30)
	await s.fade(0.0, 0.6)
	await s.wait(1.2)
	s.main.sfx("chime", null, -10.0)
	var e := flame(sp[0], 0.8)
	e.k = 0.04
	var t0: float = s.time
	while s.time < t0 + 1.8:
		e.k = lerpf(0.04, 0.6, smoothstep(0.0, 1.0, (s.time - t0) / 1.8))
		await s.beat()
	I.look = sp[0]
	I.feel("wide", "flat")
	s.face(I, 0.3, 1.5, 36)
	await s.wait(1.4)
	C.look = sp[0]
	s.face(C, -0.2, 1.6, 36)
	C.feel("wide", "flat")
	await s.wait(1.2)
	M.look = sp[0]
	s.face(M, 0.2, 1.4, 34)
	M.feel("soft", "flat")
	await s.wait(1.6)
	s.cut(sp[0] + Vector3(-0.55, 0.2, 0.6), sp[0] + Vector3(0, 0.0, 0), 30)
	await s.wait(1.6)
	await s.fade(1.0, 1.2)
	a._free_people()


# ==================================================================== 8 == --
func c8_well() -> void:
	open(21.6)
	s.film()
	music("evening")
	s.main.sound.air("night")
	take(["wim"])
	var b: Dictionary = s.stage.data.rooms.owl.beds[0]
	var bw: Dictionary = s.stage.data.rooms.owl.beds[1]
	s.stage.shut("owl_r0")
	var c0x: float = (b.x + bw.x) * 0.5
	var R := reiner(c0x, b.z + 0.0, PI, b.y)
	R.sit(0.44, "desk")
	a.keep(s.put("stool", Vector3(c0x, b.y, b.z + 0.04)))
	var W: Node3D = act("wim")
	W.visible = true
	W.lie_at(Vector3(bw.x, bw.y, bw.z), bw.yaw)
	var hen: Node3D = a.keep(s.put("toyhen", Vector3(c0x - 0.25, b.y + 0.744, b.z - 0.95), 0.6))
	var C: Node3D = a.keep(s.put("candle", Vector3(c0x + 0.34, b.y + 0.744, b.z - 0.9)))
	s.move(Vector3(c0x + 1.1, b.y + 1.5, b.z + 1.6), Vector3(c0x, b.y + 0.95, b.z - 0.6), Vector3(c0x + 0.8, b.y + 1.35, b.z + 1.0), Vector3(c0x, b.y + 0.95, b.z - 0.6), 6.0, 46)
	await s.fade(0.0, 1.0)
	R.feel("down", "flat")
	await s.say("reiner_uni", "\"Dear Mom, Pa and Lotte. All is well. The food is good, and the stairs are very big.\"")
	R.look = null
	s.cut(Vector3(c0x - 0.7, b.y + 1.15, b.z - 1.0), R.head_pos(), 40)
	await s.say("reiner_uni", "\"I have made friends. I was in a contest on Tuesday. I came second.\"", { "eyes": "sad", "mouth": "wavy" })
	s.cut(Vector3(bw.x - 1.0, bw.y + 1.15, bw.z - 0.2), Vector3(bw.x, bw.y + 0.65, bw.z - 0.5), 46)
	W.eyes = "open"
	await s.say("wim", "There were two people in it.", { "eyes": "half", "mouth": "flat" })
	s.cut(Vector3(c0x - 0.7, b.y + 1.15, b.z - 1.0), R.head_pos(), 40)
	await s.say("reiner_uni", "So it's true.", { "eyes": "sad", "mouth": "smile" })
	await s.wait(0.5)
	await s.say("reiner_uni", "They sold the cow, Wim. I can't write that I'm carrying trunks.", { "eyes": "sad", "mouth": "frown" })
	W.get_up()
	W.place(Vector3(bw.x - 0.5, bw.y, bw.z + 0.62), -PI / 2 - 0.4)
	W.sit(0.46, "sitedge")
	W.look = R
	s.cut(Vector3(c0x - 1.0, b.y + 1.25, b.z - 0.95), Vector3(c0x + 0.3, b.y + 0.98, b.z + 0.3), 52)
	await s.say("wim", "I'm frightened all the time, you know. From when I wake up. I just do it early, so it's out of the way.", { "eyes": "worry", "mouth": "flat" })
	R.look = W
	s.face(W, 0.3, 1.3, 40)
	await s.say("wim", "When you said carry it yourself, I was so frightened I forgot to be. For about a second. It was lovely.", { "eyes": "soft", "mouth": "smile" })
	s.face(R, -0.7, 1.2, 42)
	R.feel("soft", "smile")
	await s.wait(1.2)
	# a bird at the window
	s.main.sfx("flutter")
	a._bird(Vector3(c0x, b.y + 1.9, b.z - 3.4))
	a.fly([Vector3(c0x, b.y + 2.0, b.z - 4.4), Vector3(c0x, b.y + 1.75, b.z - 2.0), Vector3(c0x + 0.05, b.y + 1.3, b.z - 0.75), Vector3(c0x - 0.05, b.y + 1.02, b.z - 0.85)], 2.6)
	s.cut(Vector3(c0x - 0.9, b.y + 1.35, b.z + 0.7), Vector3(c0x, b.y + 1.3, b.z - 1.2), 50)
	await s.wait(2.8)
	a.bird.flap = 1.5
	R.look = null
	R.feel("wide", "oh")
	await s.wait(0.8)
	s.sparkle(a.bird.n.position, 14)
	s.main.sfx("paper")
	a.bird.n.visible = false
	R.pose = "sitread"
	R.hold("R", s.prop("letter"), Transform3D(Basis(Vector3.RIGHT, -1.2), Vector3(0.1, -0.02, 0.12)))
	s.cut(Vector3(c0x - 0.75, b.y + 1.2, b.z - 1.1), R.head_pos() - Vector3(0, 0.08, 0), 40)
	R.feel("down", "flat")
	await s.say("lotte", "\"Dear Reiner. I ask the candle every day. It hasn't moved. I think it likes you best.\"", { "as": "Lotte's letter" })
	await s.say("lotte", "\"Is Duchess brave? Pa says go in at the door. Which door? Mom says eat. Penny the cow lives at Hollin's now. I saw her. She looked at me kindly. Love, Lotte.\"", { "as": "Lotte's letter" })
	R.feel("sad", "smile")
	R.do("laugh", 1.4)
	await s.wait(1.6)
	R.feel("shut", "wavy")
	R.shiver = 0.6
	await s.wait(1.4)
	R.shiver = 0.0
	W.look = R
	s.cut(Vector3(c0x - 1.0, b.y + 1.25, b.z - 0.95), Vector3(c0x + 0.3, b.y + 0.98, b.z + 0.3), 52)
	await s.say("wim", "...Is she brave? Duchess?", { "eyes": "soft", "mouth": "flat" })
	R.look = hen
	await s.say("reiner_uni", "Bravest in the school.", { "eyes": "soft", "mouth": "smile" })
	drop(R, "R")
	R.pose = "desk"
	s.cut(Vector3(c0x - 0.5, b.y + 1.05, b.z - 0.3), C.position + Vector3(0, 0.25, 0), 36)
	await s.say("reiner_uni", "Stay a bit. If you like. I'll be here anyway.", { "eyes": "soft", "mouth": "smile" })
	await s.wait(0.5)
	s.main.sfx("ignite")
	var f := flame(C.position + Vector3(0, 0.285, 0), 0.75)
	f.k = 0.3
	await s.wait(1.6)
	await s.fade(1.0, 0.9)
	# it burns all night
	s.hour = 4.6
	R.lie_at(Vector3(b.x, b.y, b.z), b.yaw)
	W.lie_at(Vector3(bw.x, bw.y, bw.z), bw.yaw)
	s.move(Vector3(c0x + 0.3, b.y + 1.5, b.z + 1.5), Vector3(c0x, b.y + 0.9, b.z - 0.9), Vector3(c0x + 0.15, b.y + 1.15, b.z + 0.2), Vector3(c0x + 0.1, b.y + 1.0, b.z - 0.9), 5.0, 46)
	await s.fade(0.0, 1.0)
	await s.wait(3.2)
	await s.fade(1.0, 1.2)
	R.get_up()
	W.get_up()
	a._free_people()


# ==================================================================== 9 == --
## The Proctor's rounds: along his points with a lantern, looking where he goes.
func _vane_update(dt: float) -> void:
	var V: Node3D = act("vane")
	var tt: Node3D = s.main.tt
	if vane.get("hold", false): return
	if V.path.is_empty():
		vane.wait -= dt
		if vane.wait <= 0.0:
			vane.i = (vane.i + 1) % vane.pts.size()
			var p: Array = vane.pts[vane.i]
			vane.wait = 1.6
			V.go_free(_route(V.position, Vector3(p[0], p[1], p[2])), 1.15)
		elif fmod(vane.wait, 0.8) < dt: V.do("look", 1.6)
	# does he see her?
	var d: Vector3 = tt.position - V.position
	var see := 0.0
	if absf(d.y) < 1.5 and s.mode == "play" and not s.locked:
		var l := Vector2(d.x, d.z).length()
		var off := absf(wrapf(atan2(d.x, d.z) - V.yaw, -PI, PI))
		if l < 1.3: see = 2.2
		elif l < 8.0 and off < 0.62:
			var clear := true
			for k in range(1, 9):
				if s.stage.solid(V.head_pos().lerp(tt.position + Vector3(0, 1.1, 0), k / 9.0)): clear = false
			if clear: see = lerpf(1.6, 0.5, l / 8.0)
	spotted = clampf(spotted + (see if see > 0.0 else -0.45) * dt, 0.0, 1.0)
	s.ui.watch(spotted)
	V.look = tt if see > 0.0 else null
	if spotted >= 1.0 and not s.locked and s.mode == "play": _caught()
	if vane.has("lamp"): (vane.lamp as Node3D).position = V.position + Vector3(sin(V.yaw) * 0.6, 1.1, cos(V.yaw) * 0.6)


func _route(from: Vector3, to: Vector3) -> Array:
	var S: Node3D = s.stage
	var out: Array = []
	for q in S.find_path(S.nearest_node(from), S.nearest_node(to)): out.append(q)
	out.append({ "p": to, "door": "" })
	return out


func _caught() -> void:
	s.locked = true
	var V: Node3D = act("vane")
	vane.hold = true
	V.path = []
	V.do("point", 1.4)
	s.main.sfx("gasp")
	await s.say("vane", "You there!", { "eyes": "wide", "mouth": "shout", "auto": true })
	s.main.fx.card_puff(s.main.tt.position + Vector3(0, 0.9, 0), 16)
	s.main.sfx("card")
	s.main.tt.visible = false
	await s.fade(1.0, 0.6)
	s.main.tt.position = vane.back
	s.main.tt.floor_y = vane.back.y
	s.main.tt.visible = true
	var p: Array = vane.pts[0]
	V.place(Vector3(p[0], p[1], p[2]), 0.0)
	vane.i = 0
	spotted = 0.0
	s.cam_tgt = vane.back + Vector3(0, 1.2, 0)
	s.main.fx.card_puff(vane.back + Vector3(0, 0.9, 0), 14)
	s.main.sfx("poof", null, -6.0)
	await s.fade(0.0, 0.5)
	vane.hold = false
	s.locked = false
	s.ui.toast("Poof. Back to the shadows. Keep out of his lantern.")


func c9_errand() -> void:
	open(23.0)
	music("sneak")
	s.main.sound.air("night")
	s.hero = null
	s.leave("reiner_uni")
	for p in s.campus.people:
		p.busy = true
		p.a.visible = false
	for k in ["1A", "refectory", "library"]:
		s.stage.doors[k].want = true
		s.stage.doors[k].by_hand = true
	s.film()
	s.cut(Vector3(-16.6, 6.2, 3.0), Vector3(-6, 6.0, -6), 46)
	s.shot.p1 = Vector3(-10, 2.2, 8)
	s.shot.l1 = Vector3(-2, 2.0, -5)
	s.shot.d = 4.5
	await s.fade(0.0, 1.0)
	s.ui.place("Somebody's night errand")
	await s.wait(2.6)
	var tt := tt_at(Vector3(-2.0, 0, -2.4), PI, false)
	s.main.fx.card_puff(tt.position + Vector3(0, 0.9, 0), 14)
	s.main.sfx("card")
	s.cut(Vector3(-0.2, 1.2, 0.8), Vector3(-2.0, 1.3, -2.4), 42)
	tt.t_yaw = 0.5
	await s.wait(1.0)
	tt.play("hatTip")
	await s.wait(2.0)
	# under the player's hand
	a.tt_on = false
	s.tt_mode = true
	var V: Node3D = act("vane")
	V.visible = true
	V.lod = 0
	V.place(Vector3(-12, FY[0], -7.7), PI / 2)
	V.stage = s.stage
	V.hold("R", s.prop("bullseye"), Transform3D(Basis(), Vector3(0, -0.42, 0.02)))
	var lamp := SpotLight3D.new()
	V.add_child(lamp)
	lamp.position = Vector3(-0.25, 1.2, 0.3)
	lamp.rotation = Vector3(-0.22, PI, 0)
	lamp.light_color = Color("ffe0a0")
	lamp.light_energy = 3.2
	lamp.spot_range = 9.0
	lamp.spot_angle = 34.0
	a.keep(lamp)
	vane = { "pts": [[-12, FY[0], -7.7], [12, FY[0], -7.7], [0, FY[0], -13.5], [0, FY[1], -13.0], [13, FY[1], -7.7], [0, FY[1], -8.2], [0, FY[0], -16.5], [-15, FY[0], -7.7]], "i": 0, "wait": 1.0, "back": Vector3(0, 0, -2.4) }
	s.mode = "play"
	s.locked = false
	s.ui.bars_to = 0.0
	s.shot = {}
	s.cam_yaw = 0.0
	s.cam_pitch = 0.18
	s.cam_tgt = tt.position + Vector3(0, 1.2, 0)
	s.ui.toast("W A S D walk  ·  Shift run  ·  Space jump  ·  E mischief.   Keep out of the Proctor's lantern.")
	var done := { "n": 0 }
	var jobs: Array = [
		[Vector3(13.2, FY[0], -17.0), 1.8, "Salt the High Table's sugar", "Refectory, ground floor, east: the far table"],
		[Vector3(-16.2, FY[0], -13.6), 1.8, "Leave a card for the Proctor", "Lecture Hall 1A, ground floor, west: the lectern"],
		[Vector3(8.6, FY[1], -13.0), 1.8, "Borrow Sibyl's ledger", "Library, first floor, east: the desk"],
	]
	var led: Node3D = a.keep(s.put("ledger", Vector3(7.9, FY[1] + 1.02, -13.5), 0.4, 0.8))
	var say_left := func() -> void:
		var t_ := ""
		for j in jobs: if not j.has(true): t_ += ("\n" if t_ != "" else "") + String(j[3])
		s.ui.objective("Three small kindnesses before morning\n" + t_)
	for j in jobs:
		var u := { "pos": j[0], "r": j[1], "label": j[2] }
		u.f = func() -> void:
			if not u.get("on", true): return
			u.on = false
			j.append(true)
			done.n += 1
			vane.back = s.main.tt.position
			s.main.tt.play("spin")
			s.main.fx.card_puff(j[0] + Vector3(0, 1.0, 0), 10)
			s.main.sfx("card")
			if j[2].begins_with("Borrow"): led.visible = false
			say_left.call()
		s.uses.append(u)
	say_left.call()
	var t0: float = s.time
	while done.n < 3:
		if s.main.dev_auto and s.time > t0 + 2.0 + done.n * 1.5:
			for u in s.uses:
				if u.get("on", true):
					s.main.tt.position = u.pos
					s.main.tt.floor_y = u.pos.y
					(u.f as Callable).call()
					break
		await s.beat()
	s.ui.objective("")
	await s.wait(1.4)
	# voices below
	s.locked = true
	vane.hold = true
	V.path = []
	V.visible = false
	s.tt_mode = false
	s.film()
	await s.fade(1.0, 0.6)
	music("")
	tt = tt_at(Vector3(-1.9, FY[1], -12.6), -PI / 2, false)
	take(["aurel", "halden"])
	var A := at("aurel", 3.1, -18.6, PI / 2, FY[0])
	var H := at("halden", 2.4, -17.4, 2.4, FY[0])
	A.look = Vector3(4.3, 1.5, -19.2)
	H.look = A
	music("evening")
	s.move(Vector3(0.4, 1.5, -16.0), Vector3(3.4, 1.3, -18.6), Vector3(1.2, 1.5, -16.6), Vector3(3.5, 1.3, -18.7), 5.0, 42)
	await s.fade(0.0, 0.8)
	await s.say("halden", "You admitted a boy who cannot light a candle.", { "eyes": "half", "mouth": "flat" })
	s.face(A, 0.3, 1.4, 36)
	await s.say("aurel", "He came in out of the rain, that day, to wait for his test. He stood just there and dripped. And he said good morning to it.", { "eyes": "soft", "mouth": "flat" })
	s.over(A, H, -1.0, 36)
	await s.say("halden", "To the candle?", { "eyes": "wide", "mouth": "flat" })
	s.cut(Vector3(3.2, 1.6, -18.0), Vector3(4.3, 1.5, -19.2), 30)
	await s.say("aurel", "It bowed, Halden. Three hundred years. It has never once bowed to me.", { "as": "Aurel" })
	s.face(H, 0.2, 1.4, 34)
	await s.say("halden", "What does it mean?", { "eyes": "worry", "mouth": "flat" })
	s.face(A, 0.2, 1.4, 34)
	await s.say("aurel", "I haven't the faintest idea. That's why I let him in.", { "eyes": "soft", "mouth": "smile" })
	s.cut(Vector3(-0.2, 4.9, -14.2), Vector3(-1.9, 4.95, -12.6), 40)
	s.main.tt.t_yaw = 2.4
	s.main.tt.face_base = "surprised"
	await s.wait(1.8)
	# the flame leans: up, toward the landing
	s.cut(Vector3(3.2, 1.6, -18.0), Vector3(4.3, 1.5, -19.2), 28)
	var t1: float = s.time
	s.main.sfx("chime", null, -12.0)
	while s.time < t1 + 1.6:
		lean = Vector2(-0.5, 0.45) * smoothstep(0.0, 1.0, (s.time - t1) / 1.2)
		await s.beat()
	s.face(A, 0.2, 1.3, 32)
	A.feel("wide", "flat")
	await s.wait(1.0)
	A.look = Vector3(-1.9, 5.0, -12.6)
	await s.wait(0.6)
	s.cut(Vector3(-0.2, 4.9, -14.2), Vector3(-1.9, 4.95, -12.6), 44)
	s.main.fx.card_puff(s.main.tt.position + Vector3(0, 0.9, 0), 12)
	s.main.sfx("card")
	s.main.tt.visible = false
	lean = Vector2.ZERO
	await s.wait(1.4)
	await s.fade(1.0, 0.6)
	# the net
	A.visible = false
	H.visible = false
	music("sneak")
	tt = tt_at(Vector3(0.2, FY[1], -16.8), 0.4, true)
	V.visible = true
	V.drop("R")
	V.place(Vector3(1.6, FY[1], -9.6), PI)
	V.hold("R", s.prop("net"), Transform3D(Basis(Vector3.RIGHT, 0.9), Vector3(0, -0.5, 0.2)))
	V.feel("stern", "grin")
	V.look = tt
	s.cut(Vector3(-1.8, 5.3, -19.2), Vector3(0.8, 4.8, -13.0), 50)
	await s.fade(0.0, 0.5)
	await s.say("vane", "Madam. You are surrounded.", { "eyes": "half", "mouth": "smirk" })
	s.cut(Vector3(0.9, 4.9, -14.6), Vector3(0.2, 4.9, -16.8), 40)
	s.main.tt.face_base = "smug"
	s.main.tt.play("lookAround")
	await s.wait(1.6)
	s.cut(Vector3(-1.8, 5.3, -19.2), Vector3(0.8, 4.8, -12.0), 48)
	await s.say("vane", "By me.", { "eyes": "half", "mouth": "flat" })
	V.go_free([Vector3(0.9, FY[1], -14.8)], 2.6)
	s.cut(Vector3(1.7, 4.9, -18.2), Vector3(0.1, 4.8, -16.4), 44)
	s.main.tt.play("curtsy")
	await s.wait(1.2)
	# over the rail and down the stairwell, under the umbrella
	tt.cancel_action(false)
	tt.position = Vector3(-3.6, FY[1] + 1.0, -15.4)
	tt.floor_y = -9.0
	tt.yaw = PI
	tt.t_yaw = PI
	tt.on_ground = false
	tt.air = 0.3
	tt.vy = 1.6
	a.tt_in.jump_held = true
	s.stage.blocks.push_back([0, 0, 0, 0, 0, 0])
	V.do("castbig", 1.2)
	s.main.sfx("whoosh")
	s.cut(Vector3(-0.6, 2.2, -11.6), Vector3(-3.6, 4.3, -15.2), 46)
	s.shot.l1 = Vector3(-1.4, 1.0, -14.0)
	s.shot.d = 2.6
	var t2: float = s.time
	while s.time < t2 + 2.6:
		var u := clampf((s.time - t2) / 2.5, 0.0, 1.0)
		tt.position = Vector3(lerpf(-3.4, -1.4, smoothstep(0.0, 1.0, u)), lerpf(FY[1] + 1.3, FY[0], u), lerpf(-15.4, -14.0, u))
		tt.vy = -1.0
		tt.on_ground = false
		tt.floor_y = -9.0
		await s.beat()
	s.stage.blocks.pop_back()
	tt.position = Vector3(-1.4, FY[0], -14.0)
	tt.floor_y = FY[0]
	tt.on_ground = true
	a.tt_in.jump_held = false
	s.main.sfx("step")
	s.cut(Vector3(1.4, 1.1, -12.0), Vector3(-1.4, 1.2, -14.0), 42)
	tt.t_yaw = 0.9
	await s.wait(0.6)
	tt.play("wave")
	await s.wait(1.4)
	s.main.fx.card_puff(tt.position + Vector3(0, 0.9, 0), 18)
	s.main.sfx("card")
	tt_gone()
	await s.wait(0.5)
	V.place(Vector3(-1.4, FY[1], -14.6), -PI / 2)
	s.cut(Vector3(1.2, 5.0, -15.8), V.head_pos() - Vector3(0, 0.1, 0), 42)
	V.feel("wide", "oh")
	drop(V, "R")
	card(V, "R", "spade")
	V.do("offer", 4.0)
	await s.wait(1.0)
	s.face(V, 0.35, 1.7, 40)
	await s.say("vane", "\"Next time, bring a bigger net.\"", { "eyes": "shut", "mouth": "wavy" })
	await s.fade(1.0, 0.9)
	drop(V, "R")
	for k in ["1A", "refectory", "library"]: s.stage.doors[k].erase("by_hand")
	a._free_people()


# =================================================================== 10 == --
func c10_ledger() -> void:
	open(8.2)
	s.film()
	music("lesson")
	s.main.sound.air("room")
	var on: Array = ["nadi", "petra", "otto", "wim", "kas", "bet", "tobin", "isolde", "ilse", "rowan", "fenn", "joss", "marta", "yve", "orin", "bram"]
	take(PUP + ["lucan", "dorn", "sibyl", "vane"])
	for n in PUP: act(n).visible = false
	clear(0, -13, 10)
	# pages up everywhere
	for k in 26:
		var z := -10.2 - (k % 13) * 0.66
		var pg: Node3D = a.keep(s.put("page", Vector3(5.9, 2.95 + (k / 13) * 0.36 + sin(k * 3.0) * 0.05, z), -PI / 2, 1.0))
		pg.rotation.z = sin(k * 7.0) * 0.2
	for k in 5: a.keep(s.put("page", Vector3(-2.9, 0.9 + k * 0.3 + sin(k) * 0.1, -11.2 - k * 0.5), PI / 2, 1.0))
	ring(["nadi", "petra", "otto", "kas", "bet", "ilse", "rowan", "fenn"], Vector3(1.7, FY[0], -13.4), 2.7, 1.15, 3.2, null)
	at("joss", -2.3, -12.4, 0.4, FY[0])
	at("marta", -2.4, -15.8, 0.8, FY[0])
	at("yve", -1.6, -17.6, 1.2, FY[0])
	at("bram", -0.6, -18.6, 1.0, FY[0])
	var R := reiner(0.2, -15.4, PI / 2, FY[0])
	var W := at("wim", 0.0, -16.6, PI / 2, FY[0])
	var T := at("tobin", -1.8, -14.0, PI / 2, FY[0])
	var M := at("maron", 3.4, -18.2, -0.6, FY[0])
	var N: Node3D = act("nadi")
	N.hold("R", s.prop("page"), Transform3D(Basis(Vector3.RIGHT, -0.6), Vector3(0.04, -0.06, 0.1)))
	N.pose = "letter"
	s.move(Vector3(-2.2, 2.6, -9.0), Vector3(4.6, 2.2, -14), Vector3(-1.2, 2.2, -10.0), Vector3(4.6, 2.0, -14.6), 4.4, 54)
	s.main.sfx("bell", null, -6.0)
	await s.fade(0.0, 0.8)
	await s.wait(2.0)
	s.face(N, 0.3, 1.4, 38)
	await s.say("nadi", "It's the ledger! The whole ledger! \"Otto, four hundred and six puddings, surrendered.\"", { "eyes": "wide", "mouth": "grin" })
	var O: Node3D = act("otto")
	s.face(O, 0.2, 1.4, 38)
	await s.say("otto", "...Four hundred and six.", { "eyes": "sad", "mouth": "frown" })
	s.face(N, -0.2, 1.4, 38)
	await s.say("nadi", "\"Wim, nineteen trunks. Kas, one garden. Tobin...\" oh. \"Tobin, owes nothing. Tells us things.\"", { "eyes": "worry", "mouth": "flat" })
	s.main.sound.music("")
	for n in ["petra", "otto", "kas", "bet", "wim", "ilse", "joss"]: act(n).look = T
	R.look = T
	s.face(T, 0.2, 1.4, 36)
	T.feel("wide", "wavy")
	await s.wait(1.6)
	await s.say("tobin", "It was only... they said I'd be Lantern by spring.", { "eyes": "down", "mouth": "wavy" })
	s.face(R, 0.25, 1.4, 38)
	await s.say("reiner_uni", "What did you tell them?", { "eyes": "open", "mouth": "flat" })
	s.face(T, -0.2, 1.3, 34)
	await s.say("tobin", "That you'd step in, if it was Wim.", { "eyes": "sad", "mouth": "frown" })
	s.two(R, W, 1.0, 2.2, 40, 0.05)
	R.feel("sad", "flat")
	W.feel("sad", "flat")
	await s.wait(1.6)
	music("high")
	var Lu := at("lucan", 0.4, -7.2, PI, FY[0])
	var Do := at("dorn", 2.0, -6.8, PI, FY[0])
	var Si := at("sibyl", -0.7, -6.9, PI, FY[0])
	Lu.go_free([Vector3(0.6, FY[0], -11.2)], 1.2)
	Do.go_free([Vector3(1.7, FY[0], -11.0)], 1.2)
	Si.go_free([Vector3(-0.6, FY[0], -11.6)], 1.2)
	for n in on: act(n).look = Lu
	s.cut(Vector3(0.6, 1.3, -13.8), Vector3(0.5, 1.5, -8), 44)
	await s.until(func(): return Lu.path.is_empty(), 5.0)
	for p in [Lu, Do, Si]: p.face_yaw = PI
	s.face(Si, 0.2, 1.4, 34)
	Si.feel("wide", "small")
	await s.say("sibyl", "That is my handwriting.", { "eyes": "wide", "mouth": "small" })
	O.place(Vector3(2.3, FY[0], -12.6), -0.3)
	s.two(Do, O, 1.0, 2.6, 40, 0.1)
	Do.look = O
	O.look = Do
	await s.say("dorn", "Pudding.", { "eyes": "half", "mouth": "flat" })
	O.do("gulp", 0.8)
	await s.wait(0.9)
	await s.say("otto", "No.", { "eyes": "worry", "mouth": "flat" })
	s.main.sfx("gasp")
	var P: Node3D = act("petra")
	s.face(P, 0.2, 1.4, 38)
	await s.say("petra", "No!", { "eyes": "happy", "mouth": "shout" })
	s.cut(Vector3(-2.2, 1.9, -11.0), Vector3(1.8, 1.2, -14.2), 52)
	for n in ["kas", "bet", "ilse", "rowan"]:
		act(n).talking = 0.6
		act(n).do("stomp", 0.6)
		s.main.sfx("voice_" + ("girl" if n in ["bet", "ilse"] else "boy"))
		await s.wait(0.3)
	await s.wait(0.6)
	s.face(Lu, 0.2, 1.4, 34)
	Lu.look = R
	await s.say("lucan", "A thief has had a busy night. And here you all are, so brave by daylight.", { "eyes": "soft", "mouth": "smile" })
	R.look = Lu
	Lu.go_free([Vector3(0.5, FY[0], -13.5)], 1.0)
	await s.until(func(): return Lu.path.is_empty(), 4.0)
	Lu.turn_to(R)
	R.turn_to(Lu)
	s.over(R, Lu, -1.0, 34)
	await s.say("lucan", "You began this. You said no, out loud, and it's catching. So let us have it out, properly.", { "eyes": "half", "mouth": "flat" })
	await s.say("lucan", "Founders' Night, before the masters. You and I. If mine burns last, you go home at the end of term.", { "eyes": "open", "mouth": "flat" })
	s.over(Lu, R, 1.0, 34)
	R.look = W
	await s.wait(1.0)
	R.look = Lu
	await s.say("reiner_uni", "And if mine does?", { "eyes": "stern", "mouth": "flat" })
	s.face(Lu, 0.2, 1.3, 32)
	await s.say("lucan", "Then the Table is only a table.", { "eyes": "half", "mouth": "smile" })
	s.face(R, -0.2, 1.3, 34)
	await s.say("reiner_uni", "And you carry your own trunks.", { "eyes": "stern", "mouth": "flat" })
	s.two(Lu, R, 1.0, 2.4, 38, 0.1)
	await s.wait(0.8)
	await s.say("lucan", "...And we carry our own trunks.", { "eyes": "soft", "mouth": "smile" })
	Lu.do("offer", 2.4)
	R.do("offer", 2.4)
	s.main.sfx("clunk", null, -6.0)
	await s.wait(1.8)
	# violet ink
	var V := at("vane", 2.6, -17.2, PI * 0.7, FY[0])
	V.look = M
	M.look = V
	M.turn_to(V)
	s.two(V, M, -1.0, 2.2, 38, 0.1)
	await s.say("vane", "There is ink on your finger, Miss Maron. Violet.", { "eyes": "half", "mouth": "flat" })
	s.face(M, 0.2, 1.3, 34)
	await s.say("maron", "It was cheaper.", { "eyes": "open", "mouth": "flat" })
	s.face(V, -0.2, 1.4, 34)
	await s.say("vane", "Than what?", { "eyes": "stern", "mouth": "flat" })
	s.face(M, 0.2, 1.2, 32)
	await s.say("maron", "Than blue.", { "eyes": "half", "mouth": "smirk" })
	await s.wait(0.6)
	await s.fade(1.0, 0.9)
	drop(N, "R")
	a._free_people()


# =================================================================== 11 == --
func c11_nine() -> void:
	open(6.6)
	s.film()
	music("road")
	take(["corvin", "bet", "wim", "isolde", "maron", "otto", "kas"])
	for n in ["bet", "wim", "isolde", "maron", "otto", "kas"]: act(n).visible = false
	clear(-33, -8, 13)
	clear(8, 21.6, 5)
	clear(12, -12, 4)
	clear(-8, 19.5, 5)
	clear(-11, 8, 6)
	# Corvin, at dawn
	var R := reiner(-33.4, -8.2, -PI / 2)
	var C := at("corvin", -31.6, -7.0, -PI * 0.7)
	C.pose = "crossed"
	C.look = R
	R.pose = "lean"
	R.look = null
	s.cut(Vector3(-36.0, 1.3, -6.4), Vector3(-33.0, 1.1, -8.0), 42)
	await s.fade(0.0, 0.7)
	s.ui.place("Nine days  ·  the first")
	await s.say("corvin", "Feet. Again. You're not holding up a trunk now. You're holding up a small thing.", { "eyes": "half", "mouth": "flat" })
	R.pose = "cast"
	R.feel("stern", "flat")
	await s.wait(0.9)
	await s.fade(1.0, 0.4)
	# Bet's hood
	s.hour = 16.8
	C.visible = false
	var B := at("bet", 8.9, 21.6, -PI / 2)
	R.place(Vector3(7.4, 0, 21.6), PI / 2)
	R.pose = "stand"
	var K2: Node3D = a.keep(s.put("stool", Vector3(8.15, 0, 22.1)))
	var cn: Node3D = a.keep(s.put("candle", Vector3(8.15, 0.45, 22.1)))
	var fl := flame(Vector3(8.15, 0.735, 22.1), 0.75)
	R.look = cn
	B.look = cn
	s.cut(Vector3(8.2, 1.2, 24.4), Vector3(8.15, 0.95, 21.8), 40)
	await s.fade(0.0, 0.4)
	s.ui.place("The third  ·  with Bet")
	await s.say("bet", "Tin hood. Off a ship's lamp. Wind can't get at it. It's not cheating if nobody's written it down.", { "eyes": "half", "mouth": "grin" })
	B.do("offer", 1.6)
	await s.wait(0.6)
	var hd: Node3D = a.keep(s.put("hood", Vector3(8.15, 0.5, 22.1), PI, 1.1))
	s.main.sfx("clunk")
	await s.wait(0.8)
	var t0: float = s.time
	while s.time < t0 + 1.6:
		hd.scale = Vector3(1.1 + (s.time - t0) * 0.18, 1.1 - (s.time - t0) * 0.52, 1.1 + (s.time - t0) * 0.18)
		await s.beat()
	s.main.sfx("fizz")
	s.smoke(hd.position + Vector3(0, 0.2, 0), 8)
	B.feel("wide", "oh")
	await s.say("bet", "...It's melted it. It's the size of a pea. How's it melted it?", { "eyes": "wide", "mouth": "oh" })
	await s.say("reiner_uni", "I don't think it likes being shut in.", { "eyes": "worry", "mouth": "smile" })
	await s.fade(1.0, 0.4)
	for n in [K2, cn, hd]: n.visible = false
	s.kill_flame(fl.n)
	# Isolde
	s.hour = 12.6
	B.visible = false
	var I := at("isolde", 11.6, -11.9, 0.0, FY[1])
	R.place(Vector3(11.6, FY[1], -11.88), PI)
	R.sit(0.46, "desk")
	I.place(Vector3(13.2, FY[1], -11.2), -PI / 2)
	I.look = R
	s.cut(Vector3(13.6, FY[1] + 1.5, -13.6), Vector3(12.2, FY[1] + 1.15, -11.7), 44)
	await s.fade(0.0, 0.4)
	s.ui.place("The fifth  ·  the Library")
	I.hold("R", s.prop("page"), Transform3D(Basis(Vector3.RIGHT, -0.4), Vector3(0.04, -0.06, 0.1)))
	I.do("offer", 3.0)
	R.look = I
	await s.say("isolde", "Notes. On breath. You still stress the wrong syllable.", { "eyes": "half", "mouth": "flat" })
	await s.say("reiner_uni", "All of them?", { "eyes": "worry", "mouth": "flat" })
	s.face(I, 0.2, 1.4, 36)
	await s.say("isolde", "Fewer of them. Your candle relit itself, on Tuesday. After everyone had gone. I don't like things I can't explain. Win, so that I can watch it.", { "eyes": "lookL", "mouth": "flat" })
	await s.fade(1.0, 0.4)
	drop(I, "R")
	I.visible = false
	R.stand()
	# rain, and Wim with the bellows
	s.hour = 17.6
	R.place(Vector3(-8.0, 0, 18.6), 0.6)
	R.pose = "kneel"
	var W := at("wim", -6.6, 20.2, -2.4)
	var O := at("otto", -9.2, 20.4, 2.4)
	var K := at("kas", -7.9, 21.6, PI)
	O.hold("R", s.prop("bun"), Transform3D(Basis(), Vector3(0, -0.07, 0.05)))
	var c2: Node3D = a.keep(s.put("candle", Vector3(-7.6, 0, 19.3)))
	var f2 := flame(Vector3(-7.6, 0.285, 19.3), 0.75)
	f2.k = 0.5
	for n in [R, W, O, K]: n.look = c2
	var rain := GPUParticles3D.new()
	rain.amount = 500
	rain.lifetime = 1.1
	rain.visibility_aabb = AABB(Vector3(-10, -9, -10), Vector3(20, 12, 20))
	rain.position = Vector3(-7.6, 6.5, 19.3)
	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	pm.emission_box_extents = Vector3(7, 0.5, 7)
	pm.direction = Vector3(0.1, -1, 0)
	pm.spread = 2.0
	pm.initial_velocity_min = 6.0
	pm.initial_velocity_max = 7.0
	pm.gravity = Vector3(0, -2, 0)
	rain.process_material = pm
	var rb := BoxMesh.new()
	rb.size = Vector3(0.012, 0.16, 0.012)
	var rm := StandardMaterial3D.new()
	rm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	rm.albedo_color = Color(0.75, 0.82, 0.95)
	rb.material = rm
	rain.draw_pass_1 = rb
	rain.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	s.add_child(rain)
	a.keep(rain)
	s.main.sound.air("rain")
	s.cut(Vector3(-9.8, 0.9, 17.4), Vector3(-7.6, 0.7, 19.6), 44)
	await s.fade(0.0, 0.4)
	s.ui.place("The seventh  ·  rain")
	W.do("castdo", 1.0)
	await s.say("wim", "Sorry! Sorry. Again? Sorry.", { "eyes": "worry", "mouth": "wavy", "do": "castdo" })
	s.cut(Vector3(-8.5, 0.5, 19.0), Vector3(-7.6, 0.3, 19.3), 34)
	for k in 3:
		s.main.sfx("gust")
		f2.k = 0.12
		await s.wait(0.5)
		f2.k = 0.5
		await s.wait(0.6)
	await s.say("otto", "It's raining ON it. Why's it not minding?", { "as": "Otto" })
	s.face(R, 0.2, 1.2, 38)
	await s.say("reiner_uni", "I told it I'd stay till supper.", { "eyes": "soft", "mouth": "smile" })
	await s.fade(1.0, 0.6)
	rain.emitting = false
	rain.visible = false
	for n in ["wim", "otto", "kas"]: act(n).visible = false
	drop(O, "R")
	c2.visible = false
	s.kill_flame(f2.n)
	# Maron, the last evening
	s.hour = 18.8
	s.main.sound.air("night")
	music("evening")
	var M := at("maron", -12.0, 7.1, 0.75)
	R.place(Vector3(-10.5, 0, 8.3), -2.1)
	R.pose = "kneel"
	M.pose = "kneel"
	var cp := Vector3(-11.25, 0, 7.75)
	var c3: Node3D = a.keep(s.put("candle", cp))
	var f3 := flame(cp + Vector3(0, 0.285, 0), 0.75)
	R.look = c3
	M.look = c3
	s.cut(Vector3(-9.4, 1.0, 6.6), Vector3(-11.1, 0.75, 7.8), 42)
	await s.fade(0.0, 0.8)
	s.ui.place("The ninth  ·  the blossom tree")
	await s.say("maron", "Once more. I won't be kind about it.", { "eyes": "half", "mouth": "smile" })
	var r: Dictionary = await s.duel([["shelter", "L", "g"], ["stay", "U", "c"], ["shelter", "R", "g"], ["shelter", "D", "g"], ["stay", "U", "c"], ["shelter", "L", "g"], ["shelter", "U", "g"], ["stay", "R", "c"], ["shelter", "D", "g"], ["shelter", "L", "g"], ["stay", "U", "c"], ["shelter", "R", "g"], ["stay", "U", "c"]], { "gap": 0.68, "wide": 0.25, "name": "Not kind about it", "name_foe": "Maron", "you": 0.7, "foe": 1.0, "hurt": 0.13, "floor_you": 0.06, "floor_foe": 1.0, "fy": f3, "gust": func(_ok): M.do("cough", 0.4) })
	s.face(M, -0.2, 1.3, 34)
	await s.say("maron", "It's still lit." if r.you > 0.12 else "It went out twice. And came back twice.", { "eyes": "wide", "mouth": "small" })
	await s.wait(0.4)
	await s.say("maron", "Why won't it go out, Reiner? I'm good at this. I'm better than I've let you see.", { "eyes": "half", "mouth": "flat" })
	s.face(R, 0.2, 1.3, 36)
	R.look = M
	await s.say("reiner_uni", "I don't keep it lit. I don't know how. I just don't leave.", { "eyes": "open", "mouth": "flat" })
	s.face(M, -0.15, 1.2, 32)
	M.look = null
	M.feel("down", "flat")
	await s.wait(1.8)
	await s.say("maron", "...No. You don't, do you.", { "eyes": "sad", "mouth": "flat" })
	s.two(M, R, -1.0, 2.6, 40, 0.1)
	await s.wait(0.8)
	M.look = R
	await s.say("maron", "Go to bed. Eat first. If Lucan smiles at you, look at his hands.", { "eyes": "soft", "mouth": "smile" })
	await s.fade(1.0, 1.0)
	a._free_people()


# =================================================================== 12 == --
func c12_founders() -> void:
	open(20.4)
	s.film()
	music("founder")
	s.main.sound.air("night")
	var l: Array = PUP.duplicate()
	take(l + ["lucan", "dorn", "sibyl", "aurel", "halden", "corvin", "wren", "lys", "marrow", "vane", "sabine", "dorle"])
	var c0 := Vector3(0, 0, 4.6)
	clear(0, 4.6, 16)
	var order: Array = ["wim", "bet", "kas", "otto", "nadi", "petra", "isolde", "tobin", "ilse", "rowan", "fenn", "joss", "marta", "yve", "bram", "sunniva", "cato", "liss", "orin", "dove", "selma"]
	for n in l: act(n).visible = false
	# the school round the ring, on the path before the great door; the masters on the step
	for i in order.size():
		var an := lerpf(-2.35, 2.35, float(i) / (order.size() - 1))
		var rr := 4.3 + (1.0 if i % 2 else 0.0)
		var p := at(order[i], c0.x + sin(an) * rr, c0.z + cos(an) * rr, an + PI)
		p.look = c0 + Vector3(0, 1.2, 0)
		p.lod = 0 if i % 2 == 0 else 1
	var X := -3.6
	for n in ["wren", "marrow", "lys", "halden", "aurel", "corvin", "sabine", "dorle"]:
		var p := at(n, X, -3.4 - (0.5 if absf(X) < 2.0 else 0.0), 0.0)
		p.look = c0 + Vector3(0, 1.2, 0)
		X += 1.03
	var V := at("vane", 5.4, -2.0, -0.6)
	V.hold("R", s.prop("net"), Transform3D(Basis(Vector3.RIGHT, 0.2), Vector3(0, -0.9, 0.04)))
	var R := reiner(-1.9, 4.6, PI / 2)
	var Lu := at("lucan", 1.9, 4.6, -PI / 2)
	var Do := at("dorn", 3.1, 3.2, -PI / 2)
	var Si := at("sibyl", 3.3, 5.8, -PI * 0.6)
	var M := at("maron", -4.6, 1.4, PI / 2 - 0.5)
	M.look = R
	var sp := duel_stands(Vector3(-0.8, 0, 4.6), Vector3(0.8, 0, 4.6))
	R.look = Lu
	Lu.look = R
	for i in 14:                                          # turnip lanterns on the ground, all round the ring
		var an := (i + 0.5) / 14.0 * TAU
		a.keep(s.put("turnip", Vector3(c0.x + sin(an) * 2.75, 0, c0.z + cos(an) * 2.75), an + PI, 0.9))
	for q in [[0, 4.2, 8.4, 1.5], [-4.2, 3.4, 2.0, 1.1], [4.2, 3.4, 2.0, 1.1], [0, 3.6, -2.2, 1.0]]:      # the lanterns' light on the ring
		var o := OmniLight3D.new()
		o.position = Vector3(q[0], q[1], q[2])
		o.light_color = Color("ffcf90")
		o.light_energy = q[3]
		o.omni_range = 9.5
		s.add_child(o)
		a.keep(o)
	s.move(Vector3(13, 9, 22), Vector3(0, 3, 2), Vector3(7.5, 4.0, 14), Vector3(0, 2, 3), 7.0, 46)
	await s.fade(0.0, 1.4)
	await s.title_card("Founders' Night", "", 3.2)
	var A: Node3D = act("aurel")
	s.face(A, 0.2, 1.8, 36)
	await s.say("aurel", "Three hundred years ago tonight, a man with no gift at all lit one candle. We keep it company once a year.", { "eyes": "soft", "mouth": "flat" })
	await s.say("aurel", "A wick has been called. I could forbid it. I find I should rather like to see it.", { "eyes": "half", "mouth": "smile" })
	var W: Node3D = act("wim")
	s.face(W, 0.2, 1.4, 38)
	W.look = R
	W.hold("R", s.prop("toyhen"), Transform3D(Basis(), Vector3(0, -0.1, 0.04)))
	W.do("offer", 2.6)
	await s.say("wim", "She's watching! Duchess is watching!", { "eyes": "worry", "mouth": "shout" })
	s.face(R, 0.2, 1.4, 36)
	R.feel("soft", "smile")
	await s.wait(1.0)
	s.face(Lu, 0.2, 1.4, 34)
	await s.say("lucan", "No cape. No Table. It's you and I, Reiner. I do want you to know I think well of you.", { "eyes": "soft", "mouth": "smile" })
	s.over(Lu, R, 1.0, 36)
	R.look = Lu.hand_pos("R")
	await s.say("reiner_uni", "Your hands are shaking.", { "eyes": "open", "mouth": "flat" })
	s.face(Lu, -0.2, 1.3, 32)
	R.look = Lu
	Lu.feel("wide", "flat")
	await s.wait(1.2)
	await s.say("lucan", "...My father is a Beacon. My brother is a Beacon. Begin.", { "eyes": "stern", "mouth": "flat" })
	s.main.sfx("ignite")
	var fy := flame(sp[0], 0.95)
	var ff := flame(sp[1], 1.05)
	R.pose = "cast"
	Lu.pose = "cast"
	music("duel")
	var wide := func() -> void: s.cut(c0 + Vector3(0, 1.75, 3.5), c0 + Vector3(0, 1.28, 0), 44)
	# the first breath
	var you := 0.62
	while true:
		wide.call()
		var r: Dictionary = await s.duel([["shelter", "L", "g"], ["rise", "U", "c"], ["shelter", "R", "g"], ["rise", "U", "c"], ["shelter", "D", "g"], ["shelter", "L", "g"], ["rise", "U", "c"], ["shelter", "R", "g"], ["breathe", "D", "b"], ["shelter", "L", "g"], ["rise", "U", "c"]], { "gap": 0.74, "wide": 0.26, "name": "Lucan, smiling", "name_foe": "Lucan", "you": 0.62, "foe": 1.0, "hurt": 0.16, "push": 0.06, "floor_foe": 0.8, "fy": fy, "ff": ff, "gust": func(_ok): Lu.do("castdo", 0.6) })
		you = r.you
		if you > 0.0: break
		s.face(W, 0.2, 1.4, 38)
		await s.say("wim", "It's not out! There's a red bit! Reiner, there's a red bit!", { "eyes": "wide", "mouth": "shout" })
		fy.k = 0.2
	s.face(Lu, 0.2, 1.4, 34)
	await s.say("lucan", "Good. You've been practising.", { "eyes": "half", "mouth": "smile" })
	s.face(act("isolde"), 0.2, 1.5, 36)
	await s.say("isolde", "He's stressing the right one.", { "eyes": "wide", "mouth": "flat" })
	# the second
	while true:
		wide.call()
		var r: Dictionary = await s.duel([["shelter", "R", "g"], ["shelter", "L", "g"], ["rise", "U", "c"], ["shelter", "D", "g"], ["shelter", "R", "g"], ["rise", "U", "c"], ["shelter", "L", "g"], ["shelter", "U", "g"], ["shelter", "R", "g"], ["rise", "U", "c"], ["shelter", "D", "g"], ["shelter", "L", "g"], ["rise", "U", "c"]], { "gap": 0.62, "wide": 0.23, "name": "Lucan, not smiling", "name_foe": "Lucan", "you": maxf(0.45, you), "foe": 0.85, "hurt": 0.15, "floor_foe": 0.6, "foe_decay": 0.02, "fy": fy, "ff": ff, "gust": func(_ok): Lu.do("castdo", 0.5) })
		if r.you > 0.0: break
		s.face(act("kas"), 0.2, 1.4, 38)
		await s.say("kas", "It's only bent down! It's like the sprout! Wait for it!", { "eyes": "wide", "mouth": "shout" })
		fy.k = 0.2
	# the storm
	Lu.feel("stern", "shout")
	Lu.do("castbig", 2.4)
	s.main.sfx("whoosh")
	s.main.sfx("gust")
	s.shake = 1.0
	s.cut(c0 + Vector3(-2.4, 1.7, 3.2), c0 + Vector3(0.7, 1.3, 0), 48)
	for k in 10:
		s.burst(sp[0] + Vector3(randf_range(0, 1.4), randf_range(-0.3, 0.5), randf_range(-0.5, 0.5)), Color("dfe8ff"), Color("b8c8f0"), 8, 3.0, 0.0, 0.025, 0.5, 60.0)
		await s.wait(0.12)
	for n in order:
		act(n).do("shield", 1.4)
	var t0: float = s.time
	while s.time < t0 + 1.2:
		fy.k = lerpf(0.4, 0.03, (s.time - t0) / 1.2)
		await s.beat()
	s.cut(sp[0] + Vector3(-0.45, 0.12, 0.5), sp[0] + Vector3(0, 0.0, 0), 28)
	s.main.sound.music("")
	fy.k = 0.03
	await s.wait(1.6)
	R.pose = "kneel"
	R.look = sp[0]
	R.feel("soft", "flat")
	s.cut(c0 + Vector3(-1.1, 1.15, 2.0), c0 + Vector3(-1.7, 0.95, 0), 40)
	await s.wait(0.8)
	s.face(R, 0.35, 1.2, 36)
	await s.say("reiner_uni", "It's a nice night. You needn't hurry.", { "eyes": "soft", "mouth": "smile" })
	s.cut(sp[0] + Vector3(-0.45, 0.12, 0.5), sp[0] + Vector3(0, 0.0, 0), 28)
	await s.wait(0.6)
	douse(fy)
	s.main.sfx("gasp")
	await s.wait(0.6)
	s.cut(Vector3(-5.6, 1.9, 8.8), Vector3(0, 1.1, 4.6), 48)
	for n in order: act(n).feel("wide", "oh")
	await s.wait(1.8)
	s.face(Lu, 0.2, 1.4, 34)
	Lu.feel("wide", "flat")
	Lu.pose = "stand"
	await s.say("lucan", "It's out. ...It's out. I've...", { "eyes": "wide", "mouth": "small" })
	# nobody has been minding his own
	s.cut(sp[1] + Vector3(0.5, 0.15, 0.55), sp[1] + Vector3(0, 0.02, 0), 30)
	t0 = s.time
	while s.time < t0 + 1.6:
		ff.k = lerpf(0.8, 0.03, smoothstep(0.0, 1.0, (s.time - t0) / 1.6))
		await s.beat()
	douse(ff)
	s.face(Lu, -0.2, 1.3, 32)
	Lu.look = sp[1]
	Lu.feel("wide", "oh")
	await s.wait(1.4)
	s.cut(Vector3(-4.6, 2.2, 9.4), Vector3(0, 1.2, 4.6), 48)
	await s.say("corvin", "Both dark.", { "eyes": "wide", "mouth": "flat" })
	await s.wait(0.8)
	# and then
	s.cut(sp[0] + Vector3(-0.4, 0.1, 0.45), sp[0] + Vector3(0, 0.0, 0), 26)
	await s.wait(1.0)
	s.main.sfx("chime")
	fy = flame(sp[0], 0.95)
	fy.k = 0.03
	t0 = s.time
	while s.time < t0 + 2.6:
		fy.k = lerpf(0.03, 1.0, smoothstep(0.0, 1.0, (s.time - t0) / 2.6))
		await s.beat()
	music("wonder")
	s.face(R, 0.2, 1.2, 34)
	R.feel("wide", "oh")
	await s.wait(1.4)
	R.feel("happy", "grin")
	s.main.sfx("cheer")
	s.move(c0 + Vector3(5.2, 2.4, 6.4), c0 + Vector3(0, 1.2, 0), c0 + Vector3(-4.8, 3.2, 7.4), c0 + Vector3(0, 1.2, 0), 7.0, 50)
	for n in order:
		act(n).feel("happy", "shout")
		act(n).do("cheer" if n != "isolde" else "clap", 2.6)
	await s.wait(2.6)
	for n in order: act(n).do("clap" if n in ["isolde", "selma", "tobin"] else "cheer", 2.4)
	await s.wait(1.6)
	s.face(A, 0.2, 1.6, 34)
	A.look = sp[0]
	A.feel("soft", "smile")
	await s.say("aurel", "It took him nine years, too.", { "eyes": "soft", "mouth": "smile" })
	s.face(M, 0.2, 1.4, 34)
	await s.wait(0.2)
	M.feel("soft", "smile")
	await s.wait(1.8)
	# she isn't there
	s.cut(Vector3(-2.2, 1.7, 3.4), Vector3(-4.6, 1.2, 1.2), 42)
	M.visible = false
	R.look = Vector3(-4.6, 1.3, 1.4)
	s.main.sfx("card", null, -8.0)
	await s.wait(1.4)
	s.move(c0 + Vector3(-4.8, 3.2, 7.4), c0 + Vector3(0, 1.6, 0), Vector3(0, 12, 34), Vector3(0, 9, -6), 6.0, 48)
	s.main.sfx("bell")
	s.stage.ring_bell()
	s.campus._ring_wave()
	await s.wait(4.4)
	await s.fade(1.0, 1.2)
	drop(V, "R")
	drop(W, "R")
	a._free_people()


# =================================================================== 13 == --
func c13_still() -> void:
	open(9.6)
	s.film()
	music("school")
	s.main.sound.air("room")
	take(PUP + ["lucan", "dorn", "sibyl", "vane"])
	for n in PUP: act(n).visible = false
	clear(0, -13, 10)
	board(25, false)
	var on: Array = ["wim", "bet", "otto", "nadi", "petra", "kas", "ilse", "fenn", "joss", "tobin", "isolde", "rowan"]
	hall_crowd(on, lantern_pos(25))
	var R := reiner(2.5, -15.2, PI / 2, FY[0])
	R.look = lantern_pos(25)
	s.cut(Vector3(-2.0, 2.4, -9.6), Vector3(4.6, 1.4, -15), 52)
	await s.fade(0.0, 0.8)
	await s.wait(1.2)
	var lp := lantern_pos(25)
	s.cut(lp + Vector3(-1.0, 0.15, 0.35), lp + Vector3(0, 0.1, 0), 30)
	await s.wait(1.2)
	lit(25, true)
	s.main.sfx("ting")
	s.main.sfx("chime", null, -6.0)
	s.sparkle(lp, 14)
	await s.wait(1.2)
	var W: Node3D = act("wim")
	s.face(W, 0.3, 1.4, 38)
	await s.say("wim", "You're still last.", { "eyes": "soft", "mouth": "smile" })
	s.face(R, 0.2, 1.4, 36)
	await s.say("reiner_uni", "I know. Look at it, though.", { "eyes": "happy", "mouth": "smile" })
	var B: Node3D = act("bet")
	s.face(B, 0.2, 1.4, 38)
	await s.say("bet", "Why's there got to be a last? It's hooks. They're only hooks.", { "eyes": "half", "mouth": "smirk" })
	B.do("snap", 0.8)
	s.move(Vector3(1.1, 2.5, -14.4), Vector3(5.8, 1.55, -14.4), Vector3(0.8, 2.5, -14.4), Vector3(5.8, 1.6, -14.4), 6.0, 70)
	levelled = true
	for k in 9:
		s.main.sfx("ting", null, -4.0)
		await s.wait(0.4)
	await s.wait(1.4)
	# Dorn and Kas
	var K := at("kas", 0.6, -9.2, -PI / 2, FY[0])
	var Do := at("dorn", -0.9, -9.2, PI / 2, FY[0])
	Do.hold("R", s.prop("sprout"), Transform3D(Basis(), Vector3(0, -0.2, 0.06)))
	Do.do("offer", 3.4)
	K.look = Do
	Do.look = K
	s.two(K, Do, 1.0, 2.4, 40, 0.1)
	await s.say("dorn", "It's a different one. It's in a bigger pot. So it's less in the way.", { "eyes": "lookL", "mouth": "wavy" })
	await s.say("kas", "...Do you want to hum to it?", { "eyes": "soft", "mouth": "smile" })
	await s.wait(0.6)
	s.main.sfx("hum")
	s.face(Do, 0.2, 1.5, 36)
	Do.feel("shut", "small")
	await s.wait(1.8)
	# Lucan, with his own trunk
	for n in on: act(n).visible = false
	K.visible = false
	Do.visible = false
	drop(Do, "R")
	R.place(Vector3(0.6, FY[0], -8.4), -PI / 2)
	var Lu := at("lucan", -4.6, -8.0, PI / 2, FY[0])
	Lu.hold("R", s.prop("trunk"), Transform3D(Basis(Vector3.UP, PI / 2), Vector3(0, -0.44, 0)))
	Lu.go_free([Vector3(-0.7, FY[0], -7.6)], 0.9)
	s.cut(Vector3(0.2, 1.5, -11.0), Vector3(-1.4, 1.15, -7.8), 44)
	await s.until(func(): return Lu.path.is_empty(), 6.0)
	Lu.turn_to(R)
	R.turn_to(Lu)
	Lu.look = R
	R.look = Lu
	s.over(R, Lu, 1.0, 36)
	await s.say("lucan", "You never touched mine.", { "eyes": "open", "mouth": "flat" })
	s.over(Lu, R, -1.0, 36)
	await s.say("reiner_uni", "I wasn't trying to put yours out.", { "eyes": "open", "mouth": "flat" })
	s.face(Lu, 0.2, 1.3, 32)
	await s.wait(0.8)
	await s.say("lucan", "No. ...I shall have to think about that.", { "eyes": "sad", "mouth": "flat" })
	await s.say("lucan", "This is extraordinarily heavy. Is it always?", { "eyes": "half", "mouth": "wavy" })
	s.face(R, -0.2, 1.3, 36)
	await s.say("reiner_uni", "You get a rhythm.", { "eyes": "soft", "mouth": "smile" })
	await s.fade(1.0, 0.8)
	drop(Lu, "R")
	# the step, and buns
	s.hour = 18.2
	music("evening")
	s.main.sound.air("school")
	Lu.visible = false
	clear(0, -3, 6)
	var M := at("maron", 0.55, -3.5, 0.0)
	R.place(Vector3(-0.55, 0, -3.5), 0.0)
	R.sit(0.06, "ground")
	M.sit(0.06, "ground")
	R.hold("R", s.prop("bun"), Transform3D(Basis(), Vector3(0, -0.07, 0.05)))
	M.hold("R", s.prop("bun"), Transform3D(Basis(), Vector3(0, -0.07, 0.05)))
	s.move(Vector3(2.4, 1.0, 2.6), Vector3(0, 0.9, -3.4), Vector3(1.2, 0.95, 0.4), Vector3(0, 0.75, -3.4), 5.0, 42)
	await s.fade(0.0, 1.0)
	R.look = M
	await s.say("reiner_uni", "You went. Before I could say.", { "eyes": "open", "mouth": "flat" })
	s.cut(Vector3(1.0, 0.9, -2.0), M.head_pos(), 38)
	await s.say("maron", "I don't like crowds. They look at things.", { "eyes": "down", "mouth": "flat" })
	s.cut(Vector3(0.1, 0.92, -2.1), R.head_pos(), 40)
	await s.say("reiner_uni", "It only works because you told me to ask.", { "eyes": "soft", "mouth": "smile" })
	s.cut(Vector3(1.0, 0.9, -2.0), M.head_pos(), 36)
	await s.say("maron", "I told you to ask. You're the one who waits for the answer.", { "eyes": "soft", "mouth": "flat" })
	await s.wait(0.6)
	s.cut(Vector3(0, 1.0, -1.0), Vector3(0, 0.72, -3.5), 42)
	await s.say("reiner_uni", "You won't leave, will you? When the three weeks are up?", { "eyes": "worry", "mouth": "flat" })
	M.look = R
	M.feel("wide", "small")
	await s.wait(1.4)
	M.look = null
	await s.say("maron", "...Eat your bun.", { "eyes": "lookR", "mouth": "smile" })
	var V := at("vane", 3.4, -2.2, -PI / 2)
	V.go_free([Vector3(1.7, 0, -2.6)], 1.0)
	s.cut(Vector3(-1.2, 1.2, -1.0), Vector3(1.2, 1.0, -3.0), 44)
	await s.until(func(): return V.path.is_empty(), 4.0)
	V.turn_to(M)
	V.look = M
	M.look = V
	await s.say("vane", "You were not in the crowd, Miss Maron. At the end.", { "eyes": "half", "mouth": "flat" })
	s.cut(Vector3(1.0, 0.9, -2.0), M.head_pos(), 36)
	await s.say("maron", "I can't bear to see people lose.", { "eyes": "open", "mouth": "flat" })
	s.face(V, 0.2, 1.5, 34)
	await s.say("vane", "Which of them?", { "eyes": "stern", "mouth": "flat" })
	s.cut(Vector3(1.0, 0.9, -2.0), M.head_pos(), 34)
	await s.say("maron", "Any of them.", { "eyes": "soft", "mouth": "smile" })
	s.face(V, 0.2, 1.4, 32)
	V.do("offer", 2.0)
	await s.wait(0.8)
	await s.say("vane", "You've a bit of card on your collar.", { "eyes": "half", "mouth": "flat" })
	s.cut(Vector3(0, 1.1, 0.2), Vector3(0.2, 0.9, -3.4), 42)
	V.go_free([Vector3(6.5, 0, -2.0)], 1.1)
	R.look = M
	M.look = null
	M.feel("half", "smirk")
	await s.wait(2.2)
	await s.fade(1.0, 1.2)
	drop(R, "R")
	drop(M, "R")
	a._free_people()


# =================================================================== 14 == --
func c14_card() -> void:
	s.go_place("garden")
	s.film()
	s.hero = null
	s.leave("reiner_uni")
	music("night")
	s.main.sound.air("night")
	s.main._apply_env("garden")
	s.main.summon_t = 0.0
	s.main.arrived = false
	var tt: Node3D = s.main.tt
	s.move(Vector3(7, 3.2, 12), Vector3(0, 1.6, 0), Vector3(3.4, 1.8, 6.4), Vector3(0, 1.2, 0), 6.0, 46)
	tt.position = Vector3(0, 0, 0.6)
	tt.yaw = 0.0
	tt.t_yaw = 0.0
	tt.floor_y = 0.0
	tt.face_base = "smile"
	if tt.U.st != "away": tt.toggle_item()
	a.tt_on = true
	a.tt_in = { "x": 0.0, "z": 0.0, "run": false, "jump": false, "jump_held": false }
	await s.fade(0.0, 1.4)
	s.ui.place("Somewhere else")
	await s.wait(4.4)
	s.cut(Vector3(1.6, 1.3, 3.4), Vector3(0, 1.25, 0.6), 40)
	tt.face_base = "happy"
	tt.play("spin")
	await s.wait(2.2)
	# a seat, and something on the other one
	var seats: Array = s.main.bake.world.seats
	var sa: Dictionary = seats[0]
	tt.position = Vector3(sa.x + sin(sa.yaw) * 0.8, 0, sa.z + cos(sa.yaw) * 0.8)
	tt.yaw = sa.yaw
	tt.t_yaw = sa.yaw
	tt.cancel_action(false)
	tt.sit_toggle()
	tt.face_base = "smile"
	var f := Vector3(sin(sa.yaw), 0, cos(sa.yaw))
	var side := Vector3(f.z, 0, -f.x)
	s.cut(Vector3(sa.x, 1.25, sa.z) + f * 2.6 + side * 0.9, Vector3(sa.x, 1.0, sa.z), 40)
	await s.wait(2.4)
	var cp := Vector3(sa.x, 0.02, sa.z) + f * 1.35 - side * 0.35
	var bc: Node3D = a.keep(s.put("blackcard", cp, atan2(-f.x, -f.z), 1.3))
	bc.rotation.x = -0.25
	music("")
	s.main.sfx("card")
	s.cut(cp + Vector3(0, 0.5, 0) - f * 0.9 + side * 0.3, cp + Vector3(0, 0.2, 0), 34)
	await s.wait(1.8)
	s.cut(Vector3(sa.x, 1.3, sa.z) + f * 1.6 + side * 0.3, Vector3(sa.x, 1.22, sa.z), 34)
	tt.face_base = "surprised"
	await s.wait(1.8)
	await s.say("maron", "I didn't deal that.", { "as": "Trap Trick" })
	s.cut(cp + Vector3(0, 0.3, 0) - f * 0.95, cp + Vector3(0, 0.2, 0), 32)
	await s.tell("On the back, in white: \"I saw you.\"")
	s.move(Vector3(sa.x, 1.6, sa.z) + f * 3.0, Vector3(sa.x, 1.1, sa.z), Vector3(sa.x, 4.6, sa.z) + f * 9.0, Vector3(sa.x, 1.4, sa.z), 5.0, 44)
	tt.face_base = "pout"
	tt.play("lookAround")
	await s.wait(3.2)
	s.main.sfx("bell", null, -10.0)
	await s.fade(1.0, 1.4)
	await s.title_card("TRAP TRICK", "End of Chapter One", 5.0)
	a.tt_on = false
	tt.visible = false
	if tt.seat != null: tt.sit_toggle()
	await s.wait(0.4)
