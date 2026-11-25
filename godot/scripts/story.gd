extends Node3D
## The story: its places and people, Reiner under the player's hand, the film camera, speech, the hour of the day and the
## menus. What happens in the Opening Act is in act1.gd; the school's life is in campus.gd.

signal tick(dt: float)
signal never                         # (a scene left behind waits on this: it never comes)

const StageS := preload("res://scripts/stage.gd")
const ActorS := preload("res://scripts/actor.gd")

var main: Node3D
var ui: CanvasLayer
var act: Node
var campus: Node
var mode := "off"                     # off, menu, film (a cutscene), play
var place := ""                       # farm, town, academy
var stages := {}
var stage: Node3D                     # this place (stage.gd), or null in the town
var actors := {}
var hero: Node3D                      # Reiner
var cast_src: Node3D
var props_src: Node3D
var time := 0.0
var hour := 8.0
var hour_run := 0.0                   # hours per second, when the day runs on by itself
var indoor := 0.0
var indoor_to := 0.0
var indoor_auto := true
var lamps_out := 0.0                  # 1: every lamp in the place is out
var skipping := false
var skip_hold := 0.0
var busy := false                     # a scene is under way (no other may start)
var reading := false
var paused := false

# the camera
var cam_yaw := 0.4
var cam_pitch := 0.16
var cam_dist := 3.4
var cam_tgt := Vector3.ZERO
var cam_k := 1.0
var eye_h := 1.15                     # how high the camera looks (lower for a cat)
var cam_in := 0.0                     # under a roof: the camera keeps a little closer (by where he is, not where it is, or it'd chase itself through a doorway)
var shot := {}                        # the film's shot: { p0, p1, l0, l1, f0, f1, t, d, follow }
var shake := 0.0
var sway := 1.0

# the player
var vy := 0.0
var tt_jump := false
var locked := false                   # no walking (talking, casting)
var uses: Array = []                  # things to use here: { pos, r, label, f }
var use_now = null
var sitting = null
var step_t := 0.0
var fader := 0.0
var fader_to := 0.0
var fader_s := 1.0
var fader_c := Color.BLACK
var choice := -1
var dt_last := 0.016
var flames: Array = []
var parts := {}                       # particle bursts by name
var mark: Node3D
var tt_mode := false                 # the player has Trap Trick (a night's mischief)
var goal = null                       # where the objective is (a Vector3), marked with a bobbing light


func setup(m: Node3D) -> void:
	main = m
	ui = preload("res://scripts/ui.gd").new()
	add_child(ui)
	ui.setup(m, self)
	cast_src = load("res://assets/cast.glb").instantiate()
	props_src = load("res://assets/props.glb").instantiate()
	main.voxelize(cast_src, main.grain_mat)
	main.voxelize(props_src, main.grain_mat)
	act = preload("res://scripts/act1.gd").new()
	act.s = self
	add_child(act)
	campus = preload("res://scripts/campus.gd").new()
	campus.s = self
	add_child(campus)
	mark = _marker()


func _exit_tree() -> void:
	cast_src.free()
	props_src.free()


# ------------------------------------------------------------ places, people --
func load_stage(n: String) -> Node3D:
	if not stages.has(n):
		var st: Node3D = StageS.new()
		add_child(st)
		st.setup(main, main.bake, n)
		st.visible = false
		stages[n] = st
	return stages[n]


func go_place(n: String) -> void:
	place = n
	for k in stages: stages[k].visible = k == n
	main.garden.visible = n == "garden"
	main.town.visible = n == "town"
	main.level = "garden" if n == "garden" else "town"
	if n in ["farm", "academy", "snow"]: stage = load_stage(n)
	else: stage = null
	if stage: stage.visible = true
	if n == "academy" and not stage.has_node("water"):
		var w: Node3D = load("res://scripts/fountain.gd").new()
		w.name = "water"
		stage.add_child(w)
		w.position = Vector3(0, 0, 14)
		w.setup(main, true)
	for k in actors: actors[k].visible = false
	uses = []
	goal = null
	indoor = 0.0
	indoor_to = 0.0
	indoor_auto = true


func actor(n: String) -> Node3D:
	if not actors.has(n):
		var a: Node3D = ActorS.new()
		add_child(a)
		a.setup(main, n, main.bake, cast_src.find_child(n, true, false))
		a.visible = false
		actors[n] = a
	return actors[n]


## Bring someone in: at a place, facing a way.
func enter(n: String, p: Vector3, yaw: float) -> Node3D:
	var a := actor(n)
	a.visible = true
	a.stage = stage
	a.get_up()
	a.place(p, yaw)
	a.look = null
	a.reach = { "L": null, "R": null }
	a.eyes = "open"
	a.mouth = "flat"
	a.gest = ""
	a.lod = 0
	a.drop("L")
	a.drop("R")
	for k in 3: a.update(0.05)
	if stage and not (a in stage.actors): stage.actors.append(a)
	return a


func leave(n: String) -> void:
	if actors.has(n):
		actors[n].visible = false
		if stage: stage.actors.erase(actors[n])


func prop(n: String) -> Node3D:
	var p: Node3D = (props_src.find_child("prop_" + n, true, false) as Node3D).duplicate()
	p.transform = Transform3D()
	return p


## A thing standing in the scene.
func put(n: String, p: Vector3, yaw := 0.0, sc := 1.0) -> Node3D:
	var o := prop(n)
	add_child(o)
	o.position = p
	o.rotation.y = yaw
	o.scale = Vector3.ONE * sc
	return o


func add_flame(at: Vector3, sc := 1.0, light := true) -> Node3D:
	var f := put("flame", at, 0.0, sc)
	for g in f.find_children("*", "GeometryInstance3D", true, false) + [f]:
		if g is GeometryInstance3D: g.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	if light:
		var o := OmniLight3D.new()
		o.light_color = Color("ffb45a")
		o.light_energy = 0.3
		o.omni_range = 2.2
		o.omni_attenuation = 1.6
		o.position.y = 0.12
		f.add_child(o)
	flames.append({ "n": f, "s": sc, "ph": randf() * 9.0, "k": 1.0 })
	return f


func kill_flame(f: Node3D) -> void:
	for x in flames: if x.n == f: flames.erase(x); break
	if is_instance_valid(f): f.queue_free()


# ---------------------------------------------------------------- the hour --
const SKY := [
	# hour, top, horizon, ground, ambient, energy, fog, density, sun, energy
	[0.0, "0b1030", "28305c", "141830", "6a74b4", 0.42, "232a52", 0.005, "8ea4e8", 0.22],
	[4.8, "141c48", "4a4a80", "1e2244", "7078b0", 0.42, "3a3f70", 0.007, "8ea4e8", 0.18],
	[6.2, "4a78c0", "f8c898", "d0a080", "b8a8b4", 0.5, "f0cca8", 0.0052, "ffbc78", 1.05],
	[8.0, "4a88d8", "cfe2f4", "c4dcf0", "dcd8dc", 0.54, "cfe0f2", 0.004, "fff0d0", 1.0],
	[13.0, "3f7fd8", "c4def8", "c4def8", "dcdae6", 0.56, "c8dcf4", 0.0032, "fff4e0", 1.02],
	[16.5, "4a80cc", "e8d8c0", "d8ccb8", "dcd4d0", 0.54, "e0d4c4", 0.004, "ffe4b8", 1.0],
	[18.4, "4668a8", "f8b478", "c88a68", "b8a4b4", 0.48, "e8b090", 0.006, "ff9a58", 0.95],
	[19.6, "2c3c78", "c87a88", "6a4a68", "8a84b0", 0.44, "8a6a90", 0.006, "e8788a", 0.35],
	[21.0, "0f1638", "343c6c", "181c38", "6a74b4", 0.42, "2a325c", 0.005, "8ea4e8", 0.22],
	[24.0, "0b1030", "28305c", "141830", "6a74b4", 0.42, "232a52", 0.005, "8ea4e8", 0.22],
]


func set_hour(h: float) -> void:
	hour = fposmod(h, 24.0)
	var a: Array = SKY[0]
	var b: Array = SKY[SKY.size() - 1]
	for i in SKY.size() - 1:
		if hour >= SKY[i][0] and hour <= SKY[i + 1][0]:
			a = SKY[i]
			b = SKY[i + 1]
			break
	var k: float = clampf((hour - a[0]) / maxf(0.001, b[0] - a[0]), 0.0, 1.0)
	var mixc := func(i: int) -> Color: return Color(a[i]).lerp(Color(b[i]), k)
	var mixf := func(i: int) -> float: return lerpf(a[i], b[i], k)
	var e: Environment = main.env
	var sm: ProceduralSkyMaterial = main.sky_mat
	sm.sky_top_color = mixc.call(1)
	sm.sky_horizon_color = mixc.call(2)
	sm.sky_curve = 0.14
	sm.ground_horizon_color = mixc.call(3)
	sm.ground_bottom_color = (mixc.call(3) as Color).darkened(0.4)
	sm.sky_cover = main.stars if hour > 19.9 or hour < 5.2 else null
	var ik := smoothstep(0.0, 1.0, indoor)
	e.ambient_light_color = (mixc.call(4) as Color).lerp(Color("e8c8a4"), ik * 0.55)
	var night := 1.0 if hour > 20.5 or hour < 5.0 else 0.0
	e.ambient_light_energy = lerpf(mixf.call(5), 0.52 - night * 0.2, ik) * lerpf(1.0, 0.6, lamps_out * ik)
	if lamps_out > 0.0: e.ambient_light_color = e.ambient_light_color.lerp(Color("8a9ac8"), lamps_out * 0.7)
	e.ambient_light_sky_contribution = lerpf(0.22, 0.05, ik)
	e.fog_light_color = mixc.call(6)
	e.fog_density = mixf.call(7) * (1.0 - ik)
	e.fog_height = 0.0
	e.fog_height_density = 0.0
	var sun: DirectionalLight3D = main.sun
	sun.light_color = mixc.call(8)
	sun.light_energy = mixf.call(9)
	var day := clampf((hour - 5.6) / 13.6, 0.0, 1.0)
	var dir := Vector3(cos(day * PI) * 0.95, sin(day * PI) * 0.85 + 0.13, 0.5)
	if hour < 5.4 or hour > 19.8: dir = Vector3(0.4, 0.8, 0.45)
	sun.sky_mode = DirectionalLight3D.SKY_MODE_LIGHT_AND_SKY if hour > 5.6 and hour < 19.4 else DirectionalLight3D.SKY_MODE_LIGHT_ONLY
	sun.transform = Transform3D(Basis.looking_at(-dir.normalized(), Vector3.UP), Vector3.ZERO)
	sun.light_angular_distance = 0.0
	if place == "snow": act.ch3.weather_env()
	if stage: stage.set_lamps((1.0 - lamps_out) * (1.0 if place == "snow" or hour > 17.8 or hour < 7.2 else (0.55 if ik > 0.5 else 0.12)), lamps_out)


func is_indoors(p: Vector3) -> bool:
	if place in ["farm", "snow"]: return p.x > 150.0
	if place == "academy": return p.x > 150.0 or (absf(p.x) < 20.2 and p.z < -6.1 and p.z > -20.4 and p.y < 10.8)
	return false


# ------------------------------------------------------------- the film kit --
## One beat of the film. If the player has gone elsewhere meanwhile (another part, the title), the scene stops here for good.
func beat() -> void:
	var id: int = act.run_id
	await tick
	if act.run_id != id: await never


func wait(secs: float) -> void:
	var e := time + secs
	while time < e: await beat()


func until(f: Callable, limit := 30.0) -> void:
	var e := time + limit
	while not f.call() and time < e: await beat()


func film() -> void:
	mode = "film"
	ui.watch(0.0)
	locked = true
	ui.bars_to = 1.0
	ui.objective("")
	ui.prompt("")
	ui.clock(false)
	ui.toast_t = 0.0
	goal = null
	if hero: hero.remove_meta("driven")


func play() -> void:
	mode = "play"
	locked = false
	skipping = false
	ui.bars_to = 0.0
	sitting = null
	if hero:
		hero.set_meta("driven", true)
		hero.path = []
		hero.face_yaw = null
		cam_yaw = hero.yaw + PI
		cam_tgt = hero.position + Vector3(0, 1.15, 0)
		cam_k = 1.0
		hero.look = null
	shot = {}


func cut(p: Vector3, l: Vector3, fov := 38.0) -> void:
	shot = { "p0": p, "p1": p, "l0": l, "l1": l, "f0": fov, "f1": fov, "t": 0.0, "d": 1.0, "n": null }


func dolly(p: Vector3, l: Vector3, d: float, fov := -1.0) -> void:
	var now := _shot_now()
	shot = { "p0": now[0], "p1": p, "l0": now[1], "l1": l, "f0": now[2], "f1": fov if fov > 0.0 else now[2], "t": 0.0, "d": d, "n": null }


## Cut and move in one: from one framing to another over d seconds.
func move(p0: Vector3, l0: Vector3, p1: Vector3, l1: Vector3, d: float, f0 := 38.0, f1 := -1.0) -> void:
	shot = { "p0": p0, "p1": p1, "l0": l0, "l1": l1, "f0": f0, "f1": f1 if f1 > 0.0 else f0, "t": 0.0, "d": d, "n": null }


## Ride along with someone or something: the framing's offsets turn with it.
func ride(n: Node3D, off: Vector3, look_off: Vector3, fov := 38.0, turn := true) -> void:
	shot = { "n": n, "off": off, "lo": look_off, "f0": fov, "f1": fov, "t": 0.0, "d": 1.0, "turn": turn }


## A close shot of a face: from `ang` round their front (0 straight on, + their left), `d` metres off.
func face(a: Node3D, ang := 0.5, d := 1.5, fov := 34.0, up := 0.0) -> void:
	var h: Vector3 = a.head_pos() + Vector3(0, 0.02, 0)
	var hy := 0.0
	if a.look != null:
		var lp: Vector3 = a.look.global_position if a.look is Node3D else a.look
		hy = clampf(wrapf(atan2(lp.x - a.position.x, lp.z - a.position.z) - a.yaw, -PI, PI), -1.15, 1.15) * 0.9
	var yw: float = a.yaw + hy
	var at_: Vector3 = h + Vector3(sin(yw + ang) * d, up, cos(yw + ang) * d)
	for q in [[ang, 1.0], [ang * 0.3, 1.0], [-ang, 1.0], [ang, 0.78], [-ang, 0.78], [ang + 0.45, 0.9], [-ang - 0.45, 0.9], [0.0, 0.7], [0.75, 0.75], [-0.75, 0.75]]:
		var c: Vector3 = h + Vector3(sin(yw + q[0]) * d * q[1], up, cos(yw + q[0]) * d * q[1])
		if _open_line(c, h, [a]):
			at_ = c
			break
	cut(at_, h, fov)
	sway = 0.6


## Two people in one frame, from the side they both half face.
func two(a: Node3D, b: Node3D, side := 1.0, d := 2.6, fov := 36.0, up := 0.1) -> void:
	var m: Vector3 = (a.head_pos() + b.head_pos()) * 0.5
	var ab: Vector3 = b.position - a.position
	var n := Vector3(-ab.z, 0, ab.x).normalized() * side
	var at_: Vector3 = m + n * d + Vector3(0, up, 0)
	for q in [[1.0, 1.0], [1.0, 0.8], [-1.0, 1.0], [-1.0, 0.8], [1.0, 0.62], [-1.0, 0.62]]:
		var c: Vector3 = m + n * d * q[0] * q[1] + Vector3(0, up, 0)
		if _open_line(c, a.head_pos(), [a, b]) and _open_line(c, b.head_pos(), [a, b]):
			at_ = c
			break
	cut(at_, m - Vector3(0, 0.12, 0), fov)


## Over a's shoulder, at b.
func over(a: Node3D, b: Node3D, side := 1.0, fov := 34.0) -> void:
	var ab: Vector3 = (b.position - a.position).normalized()
	var n := Vector3(-ab.z, 0, ab.x) * side
	var at_: Vector3 = a.head_pos() - ab * 1.15 + n * 0.78 + Vector3(0, 0.16, 0)
	for q in [1.0, -1.0]:
		var c: Vector3 = a.head_pos() - ab * 1.15 + n * 0.78 * q + Vector3(0, 0.16, 0)
		if _open_line(c, b.head_pos(), [a, b]):
			cut(c, b.head_pos() - Vector3(0, 0.1, 0), fov)
			return
	if _open_line(at_, b.head_pos(), [b]): cut(at_, b.head_pos() - Vector3(0, 0.1, 0), fov)
	else: face(b, 0.3 * side, 1.4, fov)


## Is there nothing between two points: no wall, no open door's leaf, nobody's head (but these people's)?
func _open_line(c: Vector3, h: Vector3, but: Array) -> bool:
	var l := c.distance_to(h)
	if stage:
		for k in int(l / 0.08) + 1:
			if stage.solid(c.lerp(h, k * 0.08 / maxf(l, 0.01))): return false
		for k in stage.doors:
			var d: Dictionary = stage.doors[k]
			if d.open < 0.1 or c.distance_to(d.pos) > l + 2.6: continue
			for i in int(l / 0.1) + 1:
				var p: Vector3 = c.lerp(h, i * 0.1 / maxf(l, 0.01))
				if p.y < d.pos.y + 2.2 and stage.leaf_gap(d, Vector3(p.x, d.pos.y, p.z)) < 0.1: return false
	for n in actors:
		var b: Node3D = actors[n]
		if b in but or not is_instance_valid(b) or not b.visible or b.global_position.distance_to(c) > l + 1.6: continue
		var bh: Vector3 = b.head_pos()
		if bh.distance_to(c) < 0.42: return false
		var u := clampf((bh - c).dot(h - c) / maxf(0.01, l * l), 0.0, 1.0)
		if u > 0.0 and u < 0.95 and bh.distance_to(c.lerp(h, u)) < 0.26: return false
	return true


## (dev) near enough the camera, and before it, to be noticed
func shot_sees(a: Node3D) -> bool:
	var v: Vector3 = a.position + Vector3(0, 1, 0) - main.cam.global_position
	return v.length() < 9.0 and v.dot(-main.cam.global_basis.z) > 0.0


func _shot_now() -> Array:
	if shot.is_empty(): return [main.cam.position, main.cam.position - main.cam.basis.z * 3.0, main.cam.fov]
	if shot.n != null:
		var nd: Node3D = shot.n
		var b := Basis(Vector3.UP, nd.global_rotation.y) if shot.turn else Basis()
		return [nd.global_position + b * shot.off, nd.global_position + b * shot.lo, shot.f0]
	var k := smoothstep(0.0, 1.0, clampf(shot.t / shot.d, 0.0, 1.0))
	return [(shot.p0 as Vector3).lerp(shot.p1, k), (shot.l0 as Vector3).lerp(shot.l1, k), lerpf(shot.f0, shot.f1, k)]


func fade(to: float, secs := 0.6, c := Color.BLACK) -> void:
	fader_to = to
	fader_s = 1.0 / maxf(0.01, secs)
	fader_c = c
	await wait(secs)


const NAMES := { "reiner": "Reiner", "reiner_uni": "Reiner", "lotte": "Lotte", "mother": "Mother", "father": "Father", "maron": "Maron", "halden": "Professor Halden", "brandt": "Brandt", "wim": "Wim", "tobin": "Tobin", "isolde": "Isolde", "petra": "Petra", "nadi": "Nadi", "otto": "Otto", "selma": "Selma", "kas": "Kas", "wren": "Professor Wren", "marrow": "Professor Marrow", "corvin": "Master Corvin", "lys": "Professor Lys", "aurel": "Headmistress Aurel", "sabine": "Sabine", "dorle": "Dorle", "hob": "Hob", "agnes": "Agnes",
	"rowan": "Rowan", "ilse": "Ilse", "fenn": "Fenn", "yve": "Yve", "joss": "Joss", "marta": "Marta", "bram": "Bram", "sunniva": "Sunniva", "cato": "Cato", "liss": "Liss", "orin": "Orin", "dove": "Dove", "lucan": "Lucan", "dorn": "Dorn", "sibyl": "Sibyl", "bet": "Bet", "vane": "Proctor Vane", "thorne": "Mistress Thorne", "cassian": "Cassian", "odile": "Odile", "penny": "Penny", "erebus": "Erebus", "arnold": "Arnold", "dunstan": "Dunstan", "hettie": "Hettie", "gus": "Gus", "cat": "The cat" }
const VOICE := { "reiner": "boy", "reiner_uni": "boy", "lotte": "child", "mother": "woman", "father": "man", "maron": "girl", "halden": "old", "brandt": "old", "marrow": "old", "corvin": "man", "hob": "man", "wren": "woman", "lys": "woman", "aurel": "woman", "sabine": "woman", "dorle": "woman", "agnes": "woman", "bram": "man", "dorn": "man", "vane": "old", "sibyl": "woman", "thorne": "woman", "odile": "girl", "penny": "girl", "arnold": "man", "dunstan": "old", "hettie": "woman", "cat": "old" }


## Someone says a line. Waits until it's been read (or passed over).
func say(n: String, text: String, o := {}) -> void:
	var a: Node3D = actors.get(n)
	if a:
		if o.has("eyes"): a.eyes = o.eyes
		if o.has("mouth"): a.mouth = o.mouth
		if o.has("do"): a.do(o.do, o.get("d", 1.4))
		a.talking = 0.35 + text.length() * 0.029
	var v: String = VOICE.get(n, "girl" if n in ["isolde", "petra", "nadi", "selma", "ilse", "yve", "marta", "sunniva", "liss", "dove", "bet"] else "boy")
	ui.start_line(o.get("as", NAMES.get(n, "")), text, o.get("auto", mode == "film" or main.dev_auto), v)
	if main.dev_auto and mode == "film": _cam_check(n, text, o.has("as"))
	while ui.line_on: await beat()
	ui.end_line()
	if a: a.talking = 0.0
	await wait(o.get("after", 0.25))


## (dev) What stands between the camera and someone's face: "" if nothing does.
func _between(a: Node3D) -> String:
	var c: Vector3 = main.cam.global_position
	var h: Vector3 = a.head_pos()
	if main.cam.is_position_behind(h): return "behind the camera"
	var vs: Vector2 = main.cam.get_viewport().get_visible_rect().size
	var q: Vector2 = main.cam.unproject_position(h) / vs
	if q.x < 0.0 or q.x > 1.0 or q.y < 0.06 or q.y > 0.94: return "out of frame"
	var l := c.distance_to(h)
	if stage:
		for k in int(l / 0.06):
			if stage.solid(c.lerp(h, k * 0.06 / l)): return "a wall"
		for k in stage.doors:
			var d: Dictionary = stage.doors[k]
			if d.open < 0.1 or c.distance_to(d.pos) > l + 3.0: continue
			for i in int(l / 0.06):
				var p: Vector3 = c.lerp(h, i * 0.06 / l)
				if p.y < d.pos.y + 2.2 and stage.leaf_gap(d, Vector3(p.x, d.pos.y, p.z)) < 0.06: return "the door " + String(k)
	for n in actors:
		var b: Node3D = actors[n]
		if b == a or not is_instance_valid(b) or not b.visible or b.global_position.distance_to(c) > l + 0.6: continue
		var bh: Vector3 = b.head_pos()
		var u := clampf((bh - c).dot(h - c) / (l * l), 0.0, 1.0)
		if u > 0.03 and u < 0.93 and bh.distance_to(c.lerp(h, u)) < 0.2: return String(n)
	return ""


## (dev) Can whoever's speaking be seen? Or, if it's someone else's face we're on, can that?
func _cam_check(n: String, text: String, voice_off: bool) -> void:
	await wait(0.6)
	if mode != "film" or fader > 0.6: return
	var say_ := "CAM %d  %s: \"%s\"  " % [act.part, n, text.left(34)]
	if stage and stage.solid(main.cam.global_position): print(say_ + "camera inside a wall")
	var a: Node3D = actors.get(n)
	var why := "not here"
	if a and a.visible:
		why = _between(a)
		if why == "":
			var to: Vector3 = main.cam.global_position - a.head_pos()
			var f: Vector3 = (a.P.head as Node3D).global_basis.z
			var ang := rad_to_deg(absf(wrapf(atan2(to.x, to.z) - atan2(f.x, f.z), -PI, PI)))
			if ang < 100.0: return
			why = "back of the head (%d deg)" % int(ang)
	var seen: Array = []
	for k in actors:
		var b: Node3D = actors[k]
		if b != a and is_instance_valid(b) and b.visible and b.global_position.distance_to(main.cam.global_position) < 9.0 and _between(b) == "": seen.append(k)
	if seen.is_empty(): print(say_ + "NOBODY SEEN  (%s)" % why)
	elif not voice_off: print(say_ + "speaker unseen: %s  (on %s)" % [why, ", ".join(seen.slice(0, 3))])
	if main.film_dir != "" and (seen.is_empty() or why != "out of frame") and not (voice_off and not seen.is_empty()):      # (a picture of it)
		var im: Image = main.get_viewport().get_texture().get_image()
		im.resize(640, 360, Image.INTERPOLATE_BILINEAR)
		im.save_jpg("%s/cam_%02d_%04d_%s.jpg" % [main.film_dir, act.part, int(time), n], 0.85)


## Words on the screen that nobody says.
func tell(text: String) -> void:
	ui.start_line("", text, mode == "film", "")
	while ui.line_on: await beat()
	ui.end_line()


func title_card(t_: String, s_: String, secs := 3.4) -> void:
	ui.title(t_, s_)
	var e := time + secs
	while time < e:
		var k := clampf(minf((e - time) / 0.8, (secs - (e - time)) / 0.9), 0.0, 1.0)
		ui.title_l.modulate.a = k
		ui.sub_l.modulate.a = clampf(k * 1.4 - 0.4, 0.0, 1.0)
		await beat()
	ui.title_l.modulate.a = 0.0
	ui.sub_l.modulate.a = 0.0


## The player speaks an incantation. Returns how much of it came out right (0..1).
func cast(words: Array, o := {}) -> float:
	var was := locked
	locked = true
	ui.prompt("")
	ui.spell_start(words, o)
	var t0 := time
	while not ui.spell.is_empty() and not ui.spell.done:
		if skipping or main.dev_auto and time > t0 + 1.6: break
		await beat()
	var r := 1.0 if skipping or main.dev_auto or ui.spell.is_empty() else float(ui.spell.hit) / words.size()
	ui.spell_end()
	locked = was
	return r


## A duel of candles. items: [[syllable, direction, kind]]: g shelter one's own flame, c call it higher, b breathe on theirs.
## Two flames in the scene may be given (fy, ff: entries of flames); they burn as high as the duel stands. Returns
## { you, foe, hit, miss }.
func duel(items: Array, o := {}) -> Dictionary:
	var was := locked
	locked = true
	ui.prompt("")
	var d := { "you": o.get("you", 0.7), "foe": o.get("foe", 0.9), "name_you": o.get("name_you", "Reiner"), "name_foe": o.get("name_foe", ""), "wind": 0.0 }
	var fy = o.get("fy", null)
	var ff = o.get("ff", null)
	d.cb = func(kind: String, ok: bool) -> void:
		match kind:
			"g":
				main.sfx("gust")
				d.wind = 1.0
				if o.has("gust"): (o.gust as Callable).call(ok)
				if not ok: d.you = maxf(o.get("floor_you", 0.0), d.you - o.get("hurt", 0.16))
			"c": if ok: d.you = minf(1.0, d.you + o.get("grow", 0.1))
			"b":
				if ok:
					d.foe = maxf(o.get("floor_foe", 0.0), d.foe - o.get("push", 0.1))
					d.wind = -1.0
				else: d.you = maxf(o.get("floor_you", 0.0), d.you - 0.03)
	ui.spell_start(items, { "gap": o.get("gap", 0.8), "wide": o.get("wide", 0.26), "name": o.get("name", "Wicks"), "duel": d })
	var t0 := time
	while not ui.spell.is_empty() and not ui.spell.done:
		d.wind = move_toward(d.wind, 0.0, dt_last * 1.6)
		d.foe = maxf(o.get("floor_foe", 0.0), d.foe - o.get("foe_decay", 0.0) * dt_last)
		if fy != null: fy.k = lerpf(fy.k, 0.12 + d.you * 1.2, 1.0 - exp(-6.0 * dt_last))
		if ff != null: ff.k = lerpf(ff.k, 0.12 + d.foe * 1.2, 1.0 - exp(-6.0 * dt_last))
		if d.you <= 0.0 or d.foe <= 0.0 or skipping or main.dev_auto and time > t0 + 3.0: break
		await beat()
	var r := { "you": d.you, "foe": d.foe, "hit": ui.spell.get("hit", 0), "miss": ui.spell.get("miss", 0) }
	if skipping or main.dev_auto: r = { "you": maxf(0.2, d.you), "foe": d.foe, "hit": items.size(), "miss": 0 }
	ui.spell_end()
	locked = was
	return r


func read(t_: String, b_: String) -> void:
	reading = not main.dev_auto
	ui.read(t_, b_)
	while reading: await beat()
	ui.read_p.visible = false


func ask(items: Array) -> int:
	choice = -1
	var was := mode
	mode = "choice"
	ui.show_choices(items)
	while choice < 0:
		if main.dev_auto or skipping: choice = mini(main.dev_pick, items.size() - 1) if main.dev_auto else 0
		await beat()
	ui.hide_choices()
	mode = was
	return choice


# ----------------------------------------------------------------- effects --
func burst(at: Vector3, c1: Color, c2: Color, n := 24, sp := 1.6, grav := -1.5, size := 0.035, life := 0.9, spread := 180.0) -> void:
	var p := GPUParticles3D.new()
	p.amount = n
	p.lifetime = life
	p.one_shot = true
	p.explosiveness = 0.95
	var pm := ParticleProcessMaterial.new()
	pm.direction = Vector3(0, 1, 0)
	pm.spread = spread
	pm.initial_velocity_min = sp * 0.35
	pm.initial_velocity_max = sp
	pm.gravity = Vector3(0, grav, 0)
	pm.damping_min = 0.5
	pm.damping_max = 1.5
	pm.angular_velocity_min = -200.0
	pm.angular_velocity_max = 200.0
	var cv := Curve.new()
	cv.add_point(Vector2(0, 1))
	cv.add_point(Vector2(0.6, 0.8))
	cv.add_point(Vector2(1, 0))
	var ct := CurveTexture.new()
	ct.curve = cv
	pm.scale_curve = ct
	var gr := Gradient.new()
	gr.set_color(0, c1)
	gr.set_color(1, c2)
	var gt := GradientTexture1D.new()
	gt.gradient = gr
	pm.color_initial_ramp = gt
	p.process_material = pm
	var m := BoxMesh.new()
	m.size = Vector3.ONE * size
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.vertex_color_use_as_albedo = true
	m.material = mat
	p.draw_pass_1 = m
	p.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(p)
	p.global_position = at
	p.emitting = true
	get_tree().create_timer(life + 1.0).timeout.connect(p.queue_free)


func smoke(at: Vector3, n := 14, dark := true) -> void:
	burst(at, Color(0.25, 0.23, 0.24) if dark else Color(0.95, 0.95, 0.97), Color(0.45, 0.43, 0.44) if dark else Color(0.8, 0.82, 0.88), n, 0.7, 0.9, 0.07, 1.4, 50.0)


func sparkle(at: Vector3, n := 16, c := Color("ffe08a")) -> void:
	burst(at, c, Color.WHITE, n, 0.9, 0.2, 0.025, 1.1)


## A ring of runes that opens before a caster and fades.
func runes(at: Vector3, yaw: float, c: Color, secs := 1.6, r := 0.34) -> void:
	var root := Node3D.new()
	add_child(root)
	root.position = at
	root.rotation.y = yaw
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.albedo_color = c
	for k in 22:
		var b := MeshInstance3D.new()
		var bm := BoxMesh.new()
		bm.size = Vector3(0.024, 0.024, 0.024) * (2.0 if k % 5 == 0 else 1.0)
		b.mesh = bm
		b.material_override = mat
		var a := k / 22.0 * TAU
		var rr := r * (1.0 if k % 2 == 0 else 0.74)
		b.position = Vector3(cos(a) * rr, sin(a) * rr, 0)
		b.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		root.add_child(b)
	var e := time + secs
	while time < e:
		var u := 1.0 - (e - time) / secs
		root.rotation.z += 0.03
		root.scale = Vector3.ONE * maxf(0.01, smoothstep(0.0, 0.2, u) * (1.0 - smoothstep(0.75, 1.0, u)))
		await tick
	root.queue_free()


func _marker() -> Node3D:
	var n := MeshInstance3D.new()
	var m := PrismMesh.new()
	m.size = Vector3(0.22, 0.22, 0.22)
	n.mesh = m
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.albedo_color = Color("ffd87a")
	n.material_override = mat
	n.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	n.rotation.x = PI
	n.visible = false
	add_child(n)
	return n


# ------------------------------------------------------------------- input --
func key(code: int) -> void:
	if reading:
		if code in [KEY_E, KEY_G, KEY_ENTER, KEY_SPACE, KEY_ESCAPE]: reading = false
		return
	if mode == "menu" or mode == "choice" or paused:
		match code:
			KEY_UP, KEY_W: ui.menu_move(-1)
			KEY_DOWN, KEY_S: ui.menu_move(1)
			KEY_ENTER, KEY_E, KEY_SPACE, KEY_KP_ENTER: menu_pick()
			KEY_ESCAPE: if paused: pause(false)
		return
	if not ui.spell.is_empty():
		match code:
			KEY_W, KEY_UP: ui.spell_key("U")
			KEY_S, KEY_DOWN: ui.spell_key("D")
			KEY_A, KEY_LEFT: ui.spell_key("L")
			KEY_D, KEY_RIGHT: ui.spell_key("R")
		return
	if ui.line_on:
		if code in [KEY_E, KEY_G, KEY_ENTER, KEY_SPACE]: ui.advance()
		if mode == "film" or locked: return
	if code == KEY_ESCAPE and mode == "play": pause(true)
	if mode != "play" or locked: return
	if tt_mode:
		match code:
			KEY_E, KEY_G, KEY_ENTER: if use_now != null: (use_now.f as Callable).call()
			KEY_SPACE: tt_jump = true
			KEY_F: main.tt.toggle_open()
			KEY_1: main.tt.toggle_item()
			KEY_Z: main.tt.play("wave")
			KEY_C: main.tt.play("curtsy")
			KEY_L: main._set_lighting(not main.rich_light)
		return
	match code:
		KEY_E, KEY_G, KEY_ENTER: use()
		KEY_SPACE: if sitting == null: jump()
		KEY_Z: hero.do("wave", 1.6)
		KEY_X: hero.do("point", 1.3)
		KEY_C: hero.do("bow", 1.4)
		KEY_V: hero.do("cheer", 1.4)
		KEY_T: campus.show_timetable()
		KEY_J: act.show_bonds()
		KEY_L: main._set_lighting(not main.rich_light)


func click() -> void:
	if mode == "menu" or mode == "choice" or paused: menu_pick()
	elif reading: reading = false
	elif ui.line_on: ui.advance()


func menu_pick() -> void:
	if ui.menu_items.is_empty(): return
	var id: String = ui.menu_items[ui.menu_i].id
	main.sfx("pick")
	if mode == "choice": choice = ui.menu_i
	else: act.menu(id)


func pause(on: bool) -> void:
	paused = on
	if on: ui.show_menu([["resume", "Resume"], ["people", "People"], ["retry", "Restart this part"], ["title", "Title screen"], ["quit", "Quit"]], 0.55)
	else: ui.hide_menu()


func jump() -> void:
	if hero.air <= 0.01:
		vy = 3.6
		hero.air = 0.02


func use() -> void:
	if sitting != null:
		hero.stand()
		var sp: Vector3 = sitting.out
		hero.position = sp
		sitting = null
		return
	if use_now == null: return
	var f: Callable = use_now.f
	f.call()


# ------------------------------------------------------------------- frame --
func process(dt: float) -> void:
	dt_last = dt
	skip_hold = skip_hold + dt if (Input.is_physical_key_pressed(KEY_TAB) or Input.is_joy_button_pressed(0, JOY_BUTTON_BACK)) and mode == "film" else 0.0
	if skip_hold > 0.45: skipping = true
	var n := 24 if skipping and mode == "film" else 1
	for i in n:
		if i > 0 and not (skipping and mode == "film"): break
		if not paused: _step(dt if n == 1 else 0.05)
		if skipping and ui.line_on: ui.line_on = false
	if mode == "menu" or mode == "choice" or paused: ui.menu_update()
	ui.update(dt)
	fader = move_toward(fader, fader_to, dt * fader_s)
	ui.black.color = Color(fader_c, 1.0 if skipping and mode == "film" else fader)
	if skipping and mode != "film": skipping = false
	_camera(dt)
	mark.visible = goal != null and mode == "play"
	if goal != null:
		mark.position = goal + Vector3(0, 2.1 + sin(time * 2.4) * 0.1, 0)
		mark.rotation.y = time * 1.6


func _step(dt: float) -> void:
	time += dt
	if hour_run != 0.0: hour = fposmod(hour + hour_run * dt, 24.0)
	tick.emit(dt)
	if mode == "play" and tt_mode: _player_tt(dt)
	if mode == "play" and hero and not locked: _player(dt)
	elif mode == "play" and hero: hero.speed = move_toward(hero.speed, 0.0, dt * 8.0)
	_apart(dt)
	for k in actors:
		var a: Node3D = actors[k]
		if a.visible: a.update(dt)
	var hp: Vector3 = hero.position if hero else (main.tt.position if tt_mode else Vector3.ZERO)
	if stage: stage.update(dt, hp)
	elif place == "town": main.town.update(dt, hp if mode == "play" else Vector3(0, 0, 999))
	campus.update(dt)
	act.update(dt)
	if indoor_auto:
		var eye: Vector3 = main.cam.global_position
		indoor_to = 1.0 if is_indoors(eye) else 0.0
	indoor = move_toward(indoor, indoor_to, dt * 2.2)
	if place != "garden": set_hour(hour)
	for f in flames:
		if not is_instance_valid(f.n): continue
		var u: float = time * 11.0 + f.ph
		(f.n as Node3D).scale = Vector3(1.0 + sin(u * 1.3) * 0.1, 1.0 + sin(u) * 0.16 + sin(u * 2.7) * 0.07, 1.0 + cos(u * 1.1) * 0.1) * f.s * f.k
		(f.n as Node3D).rotation.y = time * 3.0 + f.ph
	_find_use()


## Nobody stands inside anybody: those on their feet are eased apart; those sitting, lying or riding stay put.
const ROOM := 0.56
const SEATED := ["sit", "desk", "sitread", "sitedge", "eat", "sleepdesk", "drive", "ground", "groundread", "lie", "swing"]
var near_log := {}


func _fixed(a: Node3D) -> bool:
	return a.pose in SEATED or a.has_meta("cart") or a.has_meta("close")


func _apart(dt: float) -> void:
	var here: Array = []
	for k in actors:
		var a: Node3D = actors[k]
		if a.visible: here.append(a)
	for a in here: a.others = here
	main.town.extra = here if place == "town" else []
	for i in here.size():
		var a: Node3D = here[i]
		if main.dev_auto and mode == "film" and fader < 0.9 and stage and shot_sees(a):
			for k in stage.doors:
				var gap: float = stage.leaf_gap(stage.doors[k], a.position)
				var kd := "%d %s|%s" % [act.part, a.who, k]
				if gap < 0.3 and (not near_log.has(kd) or gap < near_log[kd][0] - 0.05):
					near_log[kd] = [gap, time]
					print("DOOR %s  %.2f m  t=%.1f  (%s)" % [kd, gap, time, a.pose])
		for j in range(i + 1, here.size()):
			var b: Node3D = here[j]
			var dx: float = b.position.x - a.position.x
			if absf(dx) > 0.9: continue
			var dz: float = b.position.z - a.position.z
			if absf(dz) > 0.9 or absf(b.position.y - a.position.y) > 1.0: continue
			var d := sqrt(dx * dx + dz * dz)
			var fa := _fixed(a)
			var fb := _fixed(b)
			var need := ROOM
			if a.has_meta("close") or b.has_meta("close"): need = 0.4
			elif not a.path.is_empty() and not b.path.is_empty(): need = 0.47
			if main.dev_auto and d < 0.4 and fader < 0.9 and (mode == "film" or campus.show_all):
				var key := "%d %s+%s" % [act.part, a.who, b.who]
				if not near_log.has(key) or d < near_log[key][0] - 0.03:
					near_log[key] = [d, time]
					print("NEAR %s  %.2f m  t=%.1f  (%s, %s)" % [key, d, time, a.pose, b.pose])
			if d >= need or (fa and fb): continue
			if d < 0.001:
				dx = 0.01
				d = 0.01
			var push := (need - d) * (1.0 - exp(-9.0 * dt))      # (eased apart; but never let closer than that)
			var ka := 0.0 if fa else (1.0 if fb else 0.5)
			if a == hero and mode == "play": ka = 0.0
			if b == hero and mode == "play": ka = 0.0 if fa else 1.0
			var nx := dx / d * push
			var nz := dz / d * push
			if ka > 0.0: a.position = _eased(a, a.position - Vector3(nx * ka, 0, nz * ka))
			if ka < 1.0 and not fb and not (b == hero and mode == "play"): b.position = _eased(b, b.position + Vector3(nx * (1.0 - ka), 0, nz * (1.0 - ka)))


## (eased aside, but not into a wall)
func _eased(a: Node3D, p: Vector3) -> Vector3:
	if stage == null or place != "academy" or a.path.size() < 3: return p
	var q := p
	for b in stage.blocks: q = stage._out(q, b, 0.12)
	return q if q.distance_to(p) < 0.4 else a.position


func _player(dt: float) -> void:
	var fwd := 0.0
	var side := 0.0
	if Input.is_physical_key_pressed(KEY_W) or Input.is_physical_key_pressed(KEY_UP): fwd += 1.0
	if Input.is_physical_key_pressed(KEY_S) or Input.is_physical_key_pressed(KEY_DOWN): fwd -= 1.0
	if Input.is_physical_key_pressed(KEY_D) or Input.is_physical_key_pressed(KEY_RIGHT): side += 1.0
	if Input.is_physical_key_pressed(KEY_A) or Input.is_physical_key_pressed(KEY_LEFT): side -= 1.0
	var run := Input.is_physical_key_pressed(KEY_SHIFT)
	if Input.get_connected_joypads().size() > 0:
		var lx := Input.get_joy_axis(0, JOY_AXIS_LEFT_X)
		var ly := Input.get_joy_axis(0, JOY_AXIS_LEFT_Y)
		if absf(lx) > 0.18: side += lx
		if absf(ly) > 0.18: fwd -= ly
		var rx := Input.get_joy_axis(0, JOY_AXIS_RIGHT_X)
		var ry := Input.get_joy_axis(0, JOY_AXIS_RIGHT_Y)
		if absf(rx) > 0.18: cam_yaw -= rx * dt * 2.6
		if absf(ry) > 0.18: cam_pitch = clampf(cam_pitch + ry * dt * 1.6, -0.3, 1.1)
		run = run or Input.is_joy_button_pressed(0, JOY_BUTTON_B) or Vector2(lx, ly).length() > 0.92
	if main.shot_mode == "walk" or main.shot_mode == "run":
		fwd = 1.0
		run = main.shot_mode == "run"
	var m := Vector2(fwd, side)
	if m.length() > 1.0: m = m.normalized()
	if sitting != null:
		if m.length() > 0.3: use()
		return
	var dir := Vector3(-sin(cam_yaw) * m.x + cos(cam_yaw) * m.y, 0, -cos(cam_yaw) * m.x - sin(cam_yaw) * m.y)
	var want := dir.length() * (3.9 if run else 1.75)
	hero.speed = move_toward(hero.speed, want, dt * 9.0)
	if dir.length() > 0.05:
		hero.pose = "stand"
		hero.face_yaw = null
		hero.yaw = lerp_angle(hero.yaw, atan2(dir.x, dir.z), 1.0 - exp(-10.0 * dt))
	var old: Vector3 = hero.position
	var p: Vector3 = old + Vector3(sin(hero.yaw), 0, cos(hero.yaw)) * hero.speed * dt
	var gy := 0.0
	var air: float = hero.air
	if stage:
		p = stage.collide(p, 0.2, old, hero)
		if not stage.floors.is_empty():
			gy = p.y
		else: p.y = 0.0
	else:
		p.y = 0.0
		p = main.town.collide(p, 0.22)
	hero.phase += Vector2(p.x - old.x, p.z - old.z).length() / (0.36 + 0.42 * (hero.rest_y / 0.9) * (1.0 + hero.run_k * 0.6)) * PI
	if air > 0.0:
		vy -= 11.0 * dt
		air = maxf(0.0, air + vy * dt)
		if air <= 0.0: main.sfx("step")
	hero.air = air
	hero.body.position.y = air if hero.gest == "" else hero.body.position.y
	hero.position = Vector3(p.x, lerpf(old.y, gy, 1.0 - exp(-16.0 * dt)) if stage and not stage.floors.is_empty() else 0.0, p.z)
	var sp := Vector2(p.x - old.x, p.z - old.z).length() / maxf(dt, 0.001)
	if sp > 0.4 and air <= 0.0:
		step_t += dt * sp
		if step_t > (1.5 if hero.run_k > 0.5 else 0.82):
			step_t = 0.0
			main.sfx("step_in" if indoor > 0.5 else "step")


func _player_tt(dt: float) -> void:
	var fwd := 0.0
	var side := 0.0
	if not locked:
		if Input.is_physical_key_pressed(KEY_W) or Input.is_physical_key_pressed(KEY_UP): fwd += 1.0
		if Input.is_physical_key_pressed(KEY_S) or Input.is_physical_key_pressed(KEY_DOWN): fwd -= 1.0
		if Input.is_physical_key_pressed(KEY_D) or Input.is_physical_key_pressed(KEY_RIGHT): side += 1.0
		if Input.is_physical_key_pressed(KEY_A) or Input.is_physical_key_pressed(KEY_LEFT): side -= 1.0
		if Input.get_connected_joypads().size() > 0:
			var lx := Input.get_joy_axis(0, JOY_AXIS_LEFT_X)
			var ly := Input.get_joy_axis(0, JOY_AXIS_LEFT_Y)
			if absf(lx) > 0.18: side += lx
			if absf(ly) > 0.18: fwd -= ly
	var m := Vector2(fwd, side)
	if m.length() > 1.0: m = m.normalized()
	var held_j: bool = not locked and (Input.is_physical_key_pressed(KEY_SPACE) or Input.is_joy_button_pressed(0, JOY_BUTTON_A))
	main.tt.update(dt, { "x": -sin(cam_yaw) * m.x + cos(cam_yaw) * m.y, "z": -cos(cam_yaw) * m.x - sin(cam_yaw) * m.y, "run": Input.is_physical_key_pressed(KEY_SHIFT) or Input.is_joy_button_pressed(0, JOY_BUTTON_B), "jump": tt_jump, "jump_held": held_j })
	tt_jump = false


func _find_use() -> void:
	use_now = null
	if tt_mode and mode == "play" and not locked:
		var tp: Vector3 = main.tt.position
		var bb := 1.0
		for u in uses:
			if not u.get("on", true): continue
			var up: Vector3 = u.pos.position if u.pos is Node3D else u.pos
			if absf(up.y - tp.y) > 1.4: continue
			var d: float = Vector2(up.x - tp.x, up.z - tp.z).length() / u.r
			if d < bb:
				bb = d
				use_now = u
		ui.prompt("E   " + String(use_now.label) if use_now != null else "")
		return
	if mode != "play" or locked or hero == null:
		if mode == "play": ui.prompt("")
		return
	if sitting != null:
		ui.prompt("E   Stand up")
		return
	var hp: Vector3 = hero.position
	var best := 1.0
	for u in uses:
		if not u.get("on", true): continue
		var up: Vector3 = u.pos.position if u.pos is Node3D else u.pos
		if absf(up.y - hp.y) > 1.2: continue
		var l: float = Vector2(up.x - hp.x, up.z - hp.z).length()
		var d: float = l / u.r
		if u.get("first", false):                            # (it comes before other things, but not from across the yard)
			if l > u.r + 0.8: continue
			d *= 0.3
		if d < best:
			best = d
			use_now = u
	if use_now == null and place == "academy": use_now = campus.find_use(hp)
	if use_now == null and stage:
		for st in stage.data.seats:
			if Vector2(st.x - hp.x, st.z - hp.z).length() < 1.0 and hp.y < 0.5:
				use_now = { "label": "Sit down", "f": func(): sit_on(Vector3(st.x, 0, st.z), st.yaw, st.h) }
	if use_now == null and place == "town" and main.town.near_person(hp):
		use_now = { "label": "Talk", "f": func(): main.town.talk(hp) }
	ui.prompt("E   " + String(use_now.label) if use_now != null else "")


func sit_on(p: Vector3, yaw: float, h: float, pose := "sit") -> void:
	sitting = { "out": hero.position }
	hero.position = Vector3(p.x, p.y, p.z)
	hero.yaw = yaw
	hero.speed = 0.0
	hero.sit(h, pose)


func drag(rel: Vector2) -> void:
	if mode != "play": return
	cam_yaw -= rel.x * 0.006
	cam_pitch = clampf(cam_pitch + rel.y * 0.004, -0.3, 1.1)


func wheel(k: float) -> void:
	if mode == "play": cam_dist = clampf(cam_dist * k, 1.4, 9.0)


func _camera(dt: float) -> void:
	var cam: Camera3D = main.cam
	if not main.shot_view.is_empty():
		cam.look_at_from_position(main.shot_view[0], main.shot_view[1], Vector3.UP)
		cam.fov = 50.0
		return
	shake = move_toward(shake, 0.0, dt * 1.6)
	if mode != "play" and not shot.is_empty():
		shot.t += dt
		var n := _shot_now()
		# a breath of movement, as if somebody held the camera
		var s := Vector3(sin(time * 0.7) * 0.009 + sin(time * 1.9) * 0.004, sin(time * 0.9 + 1.0) * 0.008, cos(time * 0.6) * 0.008) * sway
		if shake > 0.0: s += Vector3(sin(time * 61.0), sin(time * 53.0), sin(time * 47.0)) * 0.03 * shake
		var p: Vector3 = n[0] + s
		var l: Vector3 = n[1] + s * 0.4
		if p.distance_to(l) < 0.02: l = p + Vector3(0, 0, -1)
		cam.look_at_from_position(p, l, Vector3.UP)
		cam.fov = n[2]
		return
	if hero == null and not tt_mode: return
	var want: Vector3 = main.tt.position + Vector3(0, 1.2, 0) if tt_mode else hero.position + Vector3(0, eye_h + hero.air * 0.5 - (0.35 if sitting != null else 0.0), 0)
	cam_tgt = cam_tgt.lerp(want, 1.0 - exp(-11.0 * dt))
	if cam_tgt.distance_to(want) > 5.0: cam_tgt = want
	var cp := cos(cam_pitch)
	cam_in = move_toward(cam_in, 1.0 if is_indoors(want) else 0.0, dt * 1.6)
	var dist: float = cam_dist * lerpf(1.0, 0.8, smoothstep(0.0, 1.0, cam_in))
	var off := Vector3(sin(cam_yaw) * cp, sin(cam_pitch), cos(cam_yaw) * cp) * dist
	var k := 1.0
	if stage:
		for i in range(1, 17):
			var qv := cam_tgt + off * (i / 16.0)
			if stage.solid(qv) or stage.shut_to_cam(qv):
				k = (i - 1) / 16.0
				break
	else:
		for i in range(1, 13):
			var qv := cam_tgt + off * (i / 12.0)
			if qv.y < 10.5 and Vector2(main.town._in_walk(qv, 0.25).x - qv.x, main.town._in_walk(qv, 0.25).z - qv.z).length() > 0.01:
				k = (i - 1) / 12.0
				break
	cam_k = minf(cam_k + dt * 1.6, k) if k > cam_k else lerpf(cam_k, k, 1.0 - exp(-22.0 * dt))
	var kk := maxf(cam_k, 0.2)
	var p := cam_tgt + off * kk + Vector3(0, (1.0 - kk) * 0.35, 0)
	p.y = maxf(p.y, 0.15)
	cam.fov = 52.0
	cam.look_at_from_position(p, cam_tgt, Vector3.UP)
