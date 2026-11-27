extends Node
## The Demo: the game plays itself, start to finish, the way a player would.
##
## A runner holds and presses the same keys a player does (through story.key, and story.held for the ones that are
## held down), finds its way about on foot (the school's paths, or a search over the real walls everywhere else), and
## deals with whatever comes up: it reads each line before going on, answers when asked, presses the arrows as the
## words reach the ring, sneaks past the Proctor, keeps still for the standing wands, wakes the staff by the candles,
## gets in behind a stone when the gust comes. It plays the story through to the end of Chapter Three.
##
##   Title > Demo         a new game that plays itself (it saves in its own file, user://demo.json), or carries on that one
##   Esc > Demo           the runner takes over the game you're in, from where it stands
##   Esc, while it plays  hands it back to you, right where it is
##   ` (backquote)        faster: 1x, 2x, 4x, 8x
## While it plays the keyboard, mouse and pad are its own, except for Esc and `. A watchdog stops it, with a note,
## if it can't get on (and says what it was trying to do).

const SPEEDS := [1.0, 2.0, 4.0, 8.0]
const READ_BASE := 0.9                     # how long it takes to read a line: this, and a little a letter
const READ_PER := 0.034

var main: Node3D
var s: Node
var a: Node
var on := false
var run := 0                               # bumps when it stops: anything still waiting on it gives up
var speed_i := 0
var keys := {}                             # keys held down, as a player would hold them
var doing := ""
var nav := {}                              # where it's going, and how
var errand := {}                           # (the night errand: who it's hiding from)
var met := {}                              # people it's spent an afternoon with
var pick_n := 0
var spell_at := {}                         # when to press each word's arrow (a little early or late, like anyone)
var dog := { "sig": "", "t": 0.0, "p": Vector3.ZERO }
var log_: Array = []
var t_on := 0.0
var seen_part := -2
var hud: CanvasLayer
var hud_l: Label


func setup(main_node: Node3D) -> void:
	main = main_node
	s = main.story
	a = s.act
	_hud()


# ------------------------------------------------------------------ turning it on and off --
## Title > Demo: a new game of its own, from the very beginning (or `from` a part, for testing).
func begin(from := 0) -> void:
	a.save_path = a.DEMO_SAVE
	a.bond = {}
	a.flag = {}
	a.snaps = {}
	met = {}
	pick_n = 0
	_on()
	a.start(from)


## Title > Demo > carry on: its own game, where it left off.
func carry_on() -> void:
	a.save_path = a.DEMO_SAVE
	var d = JSON.parse_string(FileAccess.get_file_as_string(a.DEMO_SAVE))
	if not d is Dictionary:
		begin()
		return
	a.bond = d.get("bond", {})
	a.flag = d.get("flag", {})
	a.snaps = d.get("snaps", {})
	_on()
	a.start(int(d.get("part", 0)))


## Esc > Demo: the game that's going on now, from where it is.
func take_over() -> void:
	_on()


func _on() -> void:
	if on: return
	on = true
	run += 1
	keys = {}
	nav = {}
	errand = {}
	dog = { "sig": "", "t": 0.0, "p": Vector3.ZERO }
	if OS.has_environment("DEMO_SPEED"): speed_i = clampi(int(OS.get_environment("DEMO_SPEED")), 0, SPEEDS.size() - 1)      # (dev)
	_speed()
	hud.visible = true
	_say("Starting")
	t_on = s.time
	_brain(run)


## Hand it back (Esc), or give up with a note saying why.
func stop(note := "") -> void:
	if not on: return
	on = false
	run += 1
	keys = {}
	nav = {}
	Engine.time_scale = 1.0
	hud.visible = false
	if note != "":
		s.ui.toast(note)
		print("DEMO stopped: ", note)


## The story's over (the end of Chapter Three, and School Days after).
func finished() -> void:
	stop("The Demo has played the whole story, to the end of Chapter Three. Over to you.")


func faster() -> void:
	speed_i = (speed_i + 1) % SPEEDS.size()
	_speed()


func _speed() -> void:
	Engine.time_scale = SPEEDS[speed_i] if on else 1.0
	_hud_text()


func holding(code: int) -> bool: return keys.has(code)


func _hold(code: int, v: bool) -> void:
	if v: keys[code] = true
	else: keys.erase(code)


## A key pressed and let go, through the game's own way in.
func _press(code: int) -> void:
	s.key(code)


func _say(t: String) -> void:
	if t == doing: return
	doing = t
	_hud_text()


# ------------------------------------------------------------------ the HUD --
func _hud() -> void:
	hud = CanvasLayer.new()
	hud.layer = 40
	add_child(hud)
	var bar := ColorRect.new()
	bar.color = Color(0.02, 0.05, 0.06, 0.78)
	bar.anchor_left = 0.0
	bar.anchor_right = 1.0
	bar.anchor_top = 1.0
	bar.anchor_bottom = 1.0
	bar.offset_top = -30
	bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud.add_child(bar)
	var line := ColorRect.new()
	line.color = Color(0.82, 0.66, 0.31, 0.8)
	line.anchor_right = 1.0
	line.offset_bottom = 1
	bar.add_child(line)
	hud_l = Label.new()
	hud_l.anchor_right = 1.0
	hud_l.anchor_bottom = 1.0
	hud_l.offset_left = 16
	hud_l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	hud_l.add_theme_font_override("font", s.ui.serif)
	hud_l.add_theme_font_size_override("font_size", 16)
	hud_l.add_theme_color_override("font_color", Color("efe3c4"))
	bar.add_child(hud_l)
	hud.visible = false


func _hud_text() -> void:
	if hud_l == null: return
	var p: String = a.PARTS[a.part] if a.part >= 0 and a.part < a.PARTS.size() else "School Days"
	hud_l.text = "DEMO   ·   %s×   ·   %s   ·   %s   ·   Esc  take over   ·   `  faster" % [str(int(SPEEDS[speed_i])), p, doing]


# ------------------------------------------------------------------ the runner --
func _brain(r: int) -> void:
	while on and r == run:
		await _step()
		if not on or r != run: return
		await get_tree().process_frame
		if a.part != seen_part:
			seen_part = a.part
			_hud_text()
			print("DEMO part %d %s  t=%.0f" % [a.part, a.PARTS[a.part] if a.part >= 0 else "School Days", s.time])
		_watchdog()


func _step() -> void:
	if s.paused:
		s.pause(false)
		return
	if s.mode == "menu":
		if s.ui.menu.visible and s.time > t_on + 6.0: stop("The Demo's over.")
		return
	if s.reading:
		await _read_card()
		return
	if not s.ui.ready_c.is_empty():
		await _ready_card()
		return
	if not s.ui.spell.is_empty():
		_spell()
		return
	spell_at = {}
	if s.mode == "choice":
		await _choose()
		return
	if s.ui.line_on and not s.ui.line_auto:
		await _line()
		return
	if s.mode != "play" or s.locked:
		_let_go()
		_say("Watching" if s.mode == "film" else "Waiting")
		return
	await _play()


## Its feet stop.
func _let_go() -> void:
	for k in [KEY_W, KEY_A, KEY_S, KEY_D, KEY_SHIFT, KEY_F, KEY_SPACE]: keys.erase(k)


## Game time, in which the runner waits: false if it was stopped meanwhile.
func _wait(secs: float) -> bool:
	var r := run
	var t0: float = s.time
	while s.time < t0 + secs:
		await get_tree().process_frame
		if r != run: return false
	return true


# -------------------------------------------------------------- what's said, asked, cast --
func _line() -> void:
	_let_go()
	_say("Reading")
	var text: String = s.ui.box_text.text
	var r := run
	while s.ui.line_on and s.ui.shown < s.ui.line_len:
		await get_tree().process_frame
		if r != run: return
	if not await _wait(READ_BASE + text.length() * READ_PER): return
	if s.ui.line_on and s.ui.box_text.text == text: _press(KEY_E)


func _read_card() -> void:
	_let_go()
	_say("Reading")
	var n: int = String(s.ui.read_b.text).length() if "read_b" in s.ui else 200
	if not await _wait(clampf(2.0 + n * 0.012, 2.5, 9.0)): return
	if s.reading: _press(KEY_E)


func _ready_card() -> void:
	_let_go()
	_say("Getting ready")
	if not await _wait(1.3): return
	if not s.ui.ready_c.is_empty():
		var d: String = s.ui.ready_c.w[0][1]
		_press({ "U": KEY_UP, "D": KEY_DOWN, "L": KEY_LEFT, "R": KEY_RIGHT }[d])


## Each arrow as its word comes to the ring: never quite on the beat, but inside it.
func _spell() -> void:
	_let_go()
	_say("Casting")
	var sp: Dictionary = s.ui.spell
	var i: int = sp.i
	if sp.done or i >= sp.w.size(): return
	if not spell_at.has(i): spell_at[i] = i * float(sp.gap) + randf_range(-0.07, 0.06) * minf(1.0, float(sp.wide) / 0.24)
	if float(sp.t) >= spell_at[i]: _press({ "U": KEY_UP, "D": KEY_DOWN, "L": KEY_LEFT, "R": KEY_RIGHT }[String(sp.w[i][1])])


func _choose() -> void:
	_let_go()
	_say("Choosing")
	var n: int = s.ui.menu_items.size()
	if n == 0: return
	var k: int = s.ask_best if s.ask_best >= 0 and s.ask_best < n else pick_n % n
	pick_n += 1
	var words := 0
	for it in s.ui.menu_items: words += String(it.l.text).length()
	if not await _wait(1.2 + words * 0.02): return
	var r := run
	while s.mode == "choice" and s.ui.menu_i != k:
		_press(KEY_DOWN if posmod(k - s.ui.menu_i, n) <= n / 2 else KEY_UP)
		if not await _wait(0.28): return
	if r == run and s.mode == "choice":
		if not await _wait(0.4): return
		_press(KEY_E)
		await _wait(0.3)


# ------------------------------------------------------------------ playing --
func _me() -> Node3D: return main.tt if s.tt_mode else s.hero


func _play() -> void:
	var me := _me()
	if me == null: return
	var obj: String = s.ui.obj_l.text if s.ui.obj_l.visible else ""
	var c3: Node = a.ch3
	if s.tt_mode:
		_errand()
		return
	if c3.mana_on and obj.begins_with("Light the birds"):
		_birds()
		return
	if c3.mana_on and not c3.lamps.is_empty() and c3.lamps_left() > 0:
		_candles(obj.begins_with("The Long Dark"))
		return
	if not a.ch2.garden.is_empty() and obj.begins_with("Come up to"):
		_wands()
		return
	if obj.begins_with("Free time") or a.ch2.spending:
		await _afternoon()
		return
	if s.place == "snow" and c3.up_trail:
		_trail()
		return
	if s.goal != null:
		await _to_use(s.goal, obj)
		return
	if s.use_now != null and s.use_now.get("first", false):
		_let_go()
		_say(String(s.use_now.label))
		if await _wait(0.5) and s.use_now != null: _press(KEY_E)
		await _wait(0.6)
		return
	if a.part < 0 and s.place == "academy":
		stop("The Demo has played the whole story, to the end of Chapter Three. Over to you.")
		return
	_let_go()
	_say("Looking about")


## Go to it, and use what's there if there's something to use.
func _to_use(goal: Vector3, obj: String) -> void:
	var u = s.use_now
	if u != null and _matches(u, goal):
		_let_go()
		_say(String(u.label))
		if await _wait(0.35) and s.use_now == u: _press(KEY_E)
		await _wait(0.5)
		return
	_say(obj.split("\n")[0] if obj != "" else "On the way")
	_go(goal, 0.55)


func _matches(u: Dictionary, goal: Vector3) -> bool:
	if not u.has("pos"): return false
	var p: Vector3 = u.pos.global_position if u.pos is Node3D else u.pos
	return Vector2(p.x - goal.x, p.z - goal.z).length() < 0.6


# ------------------------------------------------------------------ on foot --
## One frame's walking towards a place: true once there. Works out the way first (and again, if it's lost).
func _go(goal: Vector3, near: float, run_ok := true) -> bool:
	var me := _me()
	var here: Vector3 = me.position
	if nav.is_empty() or (nav.goal as Vector3).distance_to(goal) > 0.4 or nav.get("again", false):
		nav = { "goal": goal, "path": _route(here, goal), "i": 0, "t": s.time, "best": INF, "p": here, "stuck": 0 }
		if nav.path.is_empty(): nav.path = [{ "p": goal }]
	var path: Array = nav.path
	var i: int = nav.i
	var w: Dictionary = path[i]
	var wp: Vector3 = w.p
	var last := i == path.size() - 1
	var d := Vector2(wp.x - here.x, wp.z - here.z).length()
	var dt: float = s.dt_last
	# a door in the way: open it
	var dr = _door_ahead(here, wp)
	if dr != null:
		_let_go()
		_say("Opening the door")
		if s.use_now != null and String(s.use_now.label).begins_with("Open"):
			_press(KEY_E)
			nav.t = s.time
		elif dr.get("locked", "") != "":
			nav.again = true
		return false
	# a warp (in at a house door): go through it
	if w.get("warp", false) and i > 0 and Vector2((path[i - 1].p as Vector3).x - here.x, (path[i - 1].p as Vector3).z - here.z).length() < 1.6:
		if s.use_now != null and (String(s.use_now.label).begins_with("Enter") or String(s.use_now.label).begins_with("Leave") or String(s.use_now.label).begins_with("Go into")):
			_let_go()
			_press(KEY_E)
			nav = {}
			return false
	var reach_r: float = near if last else maxf(0.45, 3.9 * dt * 1.6)
	if d < reach_r and absf(wp.y - here.y) < 1.2:
		if last:
			_let_go()
			return true
		nav.i = i + 1
		return false
	# steer: the camera turns that way, and W
	var want := atan2(wp.x - here.x, wp.z - here.z) + PI
	s.cam_yaw = lerp_angle(s.cam_yaw, want, 1.0 - exp(-9.0 * dt))
	var off := absf(wrapf(want - s.cam_yaw, -PI, PI))
	_hold(KEY_W, off < 1.1)
	var left := d
	for k in range(i + 1, path.size()): left += (path[k].p as Vector3).distance_to(path[k - 1].p)
	_hold(KEY_SHIFT, run_ok and left > 6.0 and off < 0.5)
	# getting nowhere?
	if s.time > nav.t + 1.6:
		if here.distance_to(nav.p) < 0.3 and keys.has(KEY_W):
			nav.stuck += 1
			if nav.stuck % 2 == 1:                       # a step aside, then think again
				_hold(KEY_A if nav.stuck % 4 == 1 else KEY_D, true)
				get_tree().create_timer(0.45).timeout.connect(func(): keys.erase(KEY_A); keys.erase(KEY_D))
			else: nav.again = true
		nav.t = s.time
		nav.p = here
	return false


func _door_ahead(here: Vector3, wp: Vector3):
	if s.stage == null: return null
	var dir := Vector3(wp.x - here.x, 0, wp.z - here.z)
	if dir.length() < 0.01: return null
	dir = dir.normalized()
	for k in s.stage.doors:
		var d: Dictionary = s.stage.doors[k]
		if d.open > 0.6 or absf(d.pos.y - here.y) > 1.5: continue
		var to: Vector3 = d.pos - here
		to.y = 0.0
		if to.length() < 1.5 and to.dot(dir) > 0.2 and to.length() < Vector2(wp.x - here.x, wp.z - here.z).length() + 0.6: return d
	return null


# ------------------------------------------------------------------ finding the way --
func _route(from: Vector3, to: Vector3) -> Array:
	if s.stage and not s.stage.nodes.is_empty(): return _route_paths(from, to)
	var g := _route_grid(from, to)
	return g if not g.is_empty() else [{ "p": to }]


## The school: by its own paths (the ones everybody walks), with the doors and the ways in on them; to them and from
## them, among the desks and tables, a search of the floor.
func _route_paths(from: Vector3, to: Vector3) -> Array:
	var S: Node3D = s.stage
	if _clear(from, to): return [{ "p": to }]
	var ea := _entry(from, true)
	var eb := _entry(to, false)
	var out: Array = []
	for q in ea[1]: out.append(q)
	out.append({ "p": S._np(ea[0]) })
	for q in S.find_path(ea[0], eb[0]): out.append(q)
	if eb[1].is_empty(): out.append({ "p": to })
	else: for q in eb[1]: out.append(q)
	# straighten it, where nothing's in the way (never past a door or a way in)
	var keep: Array = [{ "p": from }]
	var k := 0
	while k < out.size():
		var j := k
		while j + 1 < out.size() and out[j + 1].get("door", "") == "" and not out[j + 1].get("warp", false) and out[j].get("door", "") == "" and not out[j].get("warp", false) and _clear(keep[-1].p, out[j + 1].p): j += 1
		keep.append(out[j])
		k = j + 1
	keep.pop_front()
	return keep


## The node to join the paths at, and the way there (or from there, `out` false) if it isn't a straight line.
func _entry(p: Vector3, out_: bool) -> Array:
	var S: Node3D = s.stage
	var near: Array = []
	for i in S.nodes.size():
		var q: Vector3 = S._np(i)
		if absf(q.y - p.y) > 1.0: continue
		near.append([Vector2(q.x - p.x, q.z - p.z).length(), i])
	near.sort()
	for e in near.slice(0, 10):
		if e[0] < 0.5 or _clear(p, S._np(e[1])): return [e[1], []]
	for e in near.slice(0, 6):
		var q: Vector3 = S._np(e[1])
		var g: Array = _route_grid(p, q) if out_ else _route_grid(q, p)
		if not g.is_empty(): return [e[1], g if out_ else g]
	return [S.nearest_node(p), []]


## Can one walk straight from one to the other (doors and people aside)?
func _clear(p: Vector3, q: Vector3) -> bool:
	if absf(p.y - q.y) > 0.35: return false
	var l := Vector2(q.x - p.x, q.z - p.z).length()
	var n := int(l / 0.2) + 1
	for k in range(1, n + 1):
		var v := p.lerp(q, float(k) / n)
		if not _free(Vector3(v.x, p.y, v.z)): return false
	return true


func _free(p: Vector3) -> bool:
	var q: Vector3
	if s.stage: q = s.stage.collide(p, 0.24, Vector3.INF, _me(), false, false)
	else: q = main.town.collide(p, 0.24)
	return Vector2(q.x - p.x, q.z - p.z).length() < 0.03


## Anywhere else: a search over a grid of the real walls, the hedges, the rocks.
func _route_grid(from: Vector3, to: Vector3) -> Array:
	var lo := Vector2(minf(from.x, to.x) - 9.0, minf(from.z, to.z) - 9.0)
	var hi := Vector2(maxf(from.x, to.x) + 9.0, maxf(from.z, to.z) + 9.0)
	var c := maxf(0.35, sqrt((hi.x - lo.x) * (hi.y - lo.y) / 30000.0))
	var nx := int((hi.x - lo.x) / c) + 1
	var nz := int((hi.y - lo.y) / c) + 1
	var y: float = from.y
	var cell := func(p: Vector3) -> int: return clampi(int((p.z - lo.y) / c), 0, nz - 1) * nx + clampi(int((p.x - lo.x) / c), 0, nx - 1)
	var at := func(i: int) -> Vector3: return Vector3(lo.x + (i % nx + 0.5) * c, y, lo.y + (i / nx + 0.5) * c)
	var free := {}
	var ok := func(i: int) -> bool:
		if not free.has(i): free[i] = _free(at.call(i))
		return free[i]
	var start: int = cell.call(from)
	var goal: int = cell.call(to)
	if not ok.call(goal):                                # (a well, a trough: stand by it)
		var g2 := -1
		for rr in range(1, 8):
			for dz in range(-rr, rr + 1):
				for dx in range(-rr, rr + 1):
					if maxi(absi(dx), absi(dz)) != rr: continue
					var j: int = goal + dz * nx + dx
					if j >= 0 and j < nx * nz and ok.call(j) and (g2 < 0 or (at.call(j) as Vector3).distance_to(to) < (at.call(g2) as Vector3).distance_to(to)): g2 = j
			if g2 >= 0: break
		if g2 >= 0: goal = g2
	var gs := { start: 0.0 }
	var prev := {}
	var heap: Array = [[0.0, start]]
	var gp: Vector3 = at.call(goal)
	var found := false
	var steps := 0
	while not heap.is_empty() and steps < 60000:
		steps += 1
		var top: Array = _pop(heap)
		var cur: int = top[1]
		if cur == goal:
			found = true
			break
		var cx := cur % nx
		var cz := cur / nx
		for dz in [-1, 0, 1]:
			for dx in [-1, 0, 1]:
				if dx == 0 and dz == 0: continue
				var x2: int = cx + dx
				var z2: int = cz + dz
				if x2 < 0 or z2 < 0 or x2 >= nx or z2 >= nz: continue
				var n: int = z2 * nx + x2
				if not ok.call(n): continue
				if dx != 0 and dz != 0 and (not ok.call(cz * nx + x2) or not ok.call(z2 * nx + cx)): continue
				var g: float = gs[cur] + (1.414 if dx != 0 and dz != 0 else 1.0)
				if not gs.has(n) or g < gs[n]:
					gs[n] = g
					prev[n] = cur
					_push(heap, [g + (at.call(n) as Vector3).distance_to(gp) / c, n])
	if not found: return []
	var cells: Array = []
	var k := goal
	while k != start:
		cells.push_front(at.call(k))
		k = prev[k]
	cells.append(to if ok.call(cell.call(to)) else gp)
	var out: Array = []
	var from_p := from
	var j := 0
	while j < cells.size():
		var far := j
		var lim := mini(cells.size() - 1, j + 30)
		for t in range(lim, j, -1):
			if _clear(from_p, cells[t]):
				far = t
				break
		out.append({ "p": cells[far] })
		from_p = cells[far]
		j = far + 1
	return out


func _push(h: Array, e: Array) -> void:
	h.append(e)
	var i := h.size() - 1
	while i > 0:
		var p := (i - 1) / 2
		if h[p][0] <= h[i][0]: break
		var t = h[p]
		h[p] = h[i]
		h[i] = t
		i = p


func _pop(h: Array) -> Array:
	var top: Array = h[0]
	var last: Array = h.pop_back()
	if not h.is_empty():
		h[0] = last
		var i := 0
		while true:
			var l := i * 2 + 1
			var r := l + 1
			var m := i
			if l < h.size() and h[l][0] < h[m][0]: m = l
			if r < h.size() and h[r][0] < h[m][0]: m = r
			if m == i: break
			var t = h[m]
			h[m] = h[i]
			h[i] = t
			i = m
	return top


# ------------------------------------------------------------------ the special ones --
## Up by the flags; behind a stone when the gust comes.
func _trail() -> void:
	var c3: Node = a.ch3
	var me := _me()
	if c3.gust > 0.02 or s.ui.bell_t < 1.5:
		var best = null
		var bd := INF
		for q in s.stage.data.marks.stones:
			var lee := Vector3(q[0], 0, q[1] + 0.75)
			var d: float = lee.distance_to(Vector3(me.position.x, 0, me.position.z))
			if d < bd:
				bd = d
				best = lee
		if best != null:
			_say("Behind a stone")
			if Vector2(me.position.x - best.x, me.position.z - best.z).length() < 0.5 and me.position.z > best.z - 1.0:
				_let_go()
				return
			_go(best, 0.35, true)
			return
	if s.goal != null:
		_say("Up by the flags")
		_go(s.goal, 1.0)


## The night errand, as Trap Trick: to each of the three, keeping out of the Proctor's lantern.
func _errand() -> void:
	var tt: Node3D = main.tt
	var V: Node3D = a.ch1.act("vane")
	var job = null
	var bd := INF
	for u in s.uses:
		if not u.get("on", true) or not u.has("label") or u.get("first", false): continue
		var p: Vector3 = u.pos
		var d := p.distance_to(tt.position)
		if d < bd:
			bd = d
			job = u
	if job == null:
		_let_go()
		return
	if s.use_now == job:
		_let_go()
		_say(String(job.label))
		_press(KEY_E)
		await _wait(0.8)
		return
	# is he looking this way, or about to?
	var dv: Vector3 = tt.position - V.position
	var near_him: bool = absf(dv.y) < 1.5 and Vector2(dv.x, dv.z).length() < 9.5
	var facing: bool = absf(wrapf(atan2(dv.x, dv.z) - V.yaw, -PI, PI)) < 0.95
	if a.ch1.spotted > 0.02 or (near_him and facing):
		_say("Keeping out of the lantern")
		var away := Vector3(dv.x, 0, dv.z).normalized()
		if errand.get("hide", null) == null or s.time > errand.get("hide_t", 0.0) + 4.0:
			errand.hide = tt.position + away * 4.0
			errand.hide_t = s.time
			nav = {}
		_go(errand.hide, 0.6, true)
		return
	errand.hide = null
	_say(String(job.label))
	_go(job.pos, 0.5, false)


## The standing wands: up to one while its tip's blue; still as a tree while it's red.
func _wands() -> void:
	var R: Node3D = s.hero
	var best = null
	var bd := INF
	for g in a.ch2.garden:
		if g.get("gone", false) or g.get("met", false) or g.get("hop", 0.0) > 0.0: continue
		var d: float = Vector2(g.p.x - R.position.x, g.p.z - R.position.z).length()
		if d < bd:
			bd = d
			best = g
	if best == null:
		_let_go()
		return
	var looking: bool = float(best.get("look", 0.0)) > 0.0
	var blue_left: float = float(best.get("rest", 2.0)) + float(best.get("look", 0.0))
	if bd < 4.8 and (looking or blue_left < 0.55):
		_let_go()
		_say("Standing still: it's watching")
		return
	_say("Up to a standing wand")
	_go(best.p, 0.75, false)


## The free afternoon: someone new each time, and when there's nobody left, call it a day.
func _afternoon() -> void:
	var c2: Node = a.ch2
	if c2.spending:
		_let_go()
		_say("Spending the afternoon")
		return
	var who := ""
	for k in c2.free_on:
		if not met.has(k):
			who = k
			break
	if who == "" and not c2.free_on.is_empty(): who = c2.free_on.keys()[pick_n % c2.free_on.size()]
	if who == "":
		var home := Vector3(-28.2, 0, 21)
		if s.use_now != null and String(s.use_now.label) == "Call it a day":
			_press(KEY_E)
			await _wait(0.6)
			return
		_say("Calling it a day")
		_go(home, 1.0)
		return
	var f: Dictionary = c2.free_on[who]
	if s.use_now != null and f.has("u") and s.use_now == f.u:
		_let_go()
		met[who] = true
		_say("With " + String(s.NAMES.get(who, who)))
		_press(KEY_E)
		await _wait(0.8)
		return
	_say("Looking for " + String(s.NAMES.get(who, who)))
	_go(f.p, 1.0)


## The staff, by the candles: up to one, awake till it catches, away again; and never all of him.
func _candles(dark: bool) -> void:
	var c3: Node = a.ch3
	if c3.faint > 0.0:
		_let_go()
		_say("Down. Getting up")
		return
	var R: Node3D = s.hero
	var l = null
	for q in c3.lamps:
		if not q.lit:
			l = q
			break
	if l == null:
		_let_go()
		return
	var wim: bool = dark and l.get("wim", false)
	var spot: Vector3 = l.p + (Vector3(-0.3, 0, 1.0 if l.p.z < -8.0 else -1.0) if dark else (Vector3(R.position.x - l.p.x, 0, R.position.z - l.p.z).normalized() * 1.0))
	var there: bool = Vector2(spot.x - R.position.x, spot.z - R.position.z).length() < 0.6
	if not there:
		keys.erase(KEY_F)
		if c3.mana < 0.35 and not c3.awake:                 # (get some back first)
			_let_go()
			_say("Getting his breath back")
			return
		_say("To the next candle")
		_go(spot, 0.45, false)
		return
	_hold(KEY_W, false)
	_hold(KEY_SHIFT, false)
	if wim:
		keys.erase(KEY_F)
		_say("Waiting for Wim")
		return
	var low: bool = c3.mana < 0.14
	_hold(KEY_F, not low)
	_say("Waking the staff" if not low else "Putting it away")


## The paper birds: under where one's going, the staff awake as it comes over, and away again.
func _birds() -> void:
	var c3: Node = a.ch3
	var R: Node3D = s.hero
	if c3.faint > 0.0:
		_let_go()
		return
	var b: Dictionary = c3.cur_bird
	if b.is_empty() or not is_instance_valid(b.n):
		keys.erase(KEY_F)
		_say("Waiting for a bird")
		if c3.mana < 0.6: _let_go()
		return
	var under: Vector3 = Vector3(b.c.x, 0, b.c.z) + Vector3(b.d.z, 0, -b.d.x) * 0.6
	var bp: Vector3 = (b.n as Node3D).position
	var to := Vector2(bp.x - R.position.x, bp.z - R.position.z)
	var coming: bool = to.dot(Vector2(b.d.x, b.d.z)) < 0.5
	if Vector2(under.x - R.position.x, under.z - R.position.z).length() > 0.5 and not c3.awake:
		_say("Under the bird's way")
		_go(under, 0.4, true)
		return
	_hold(KEY_W, false)
	_hold(KEY_SHIFT, false)
	_hold(KEY_F, coming and to.length() < 5.0 and c3.mana > 0.12)
	_say("Catching it with the staff's light")


# ------------------------------------------------------------------ the watchdog --
## If nothing's changed for a long while, something's wrong: stop, and say what it was trying to do.
func _watchdog() -> void:
	var me := _me()
	var p: Vector3 = me.position if me else Vector3.ZERO
	var sig := "%d|%s|%s|%s|%d" % [a.part, s.mode, s.ui.obj_l.text, s.ui.box_text.text, s.ui.menu_i]
	if sig != dog.sig or p.distance_to(dog.p) > 1.5:
		dog = { "sig": sig, "t": s.time, "p": p }
		return
	var limit := 240.0 if s.mode == "film" else 100.0
	if s.time > dog.t + limit:
		var where := "part %d (%s), %s at %s" % [a.part, a.PARTS[a.part] if a.part >= 0 else "school", doing, p]
		log_.append(where)
		stop("The Demo couldn't get on (%s). Over to you." % doing.to_lower())
		print("DEMO stuck: ", where, "  objective '", s.ui.obj_l.text, "'")
		if not nav.is_empty():
			var pts := []
			for w in nav.path: pts.append([w.p, w.get("door", ""), w.get("warp", false)])
			print("DEMO route ", pts, "  at ", nav.i, "  stuck ", nav.stuck)
