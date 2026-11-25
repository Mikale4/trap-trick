extends "res://scripts/ch2.gd"
## Chapter Three: "What Is Kept". First a long way north, in the Drowse, mountains that are said to be a dragon asleep: Penny
## guides four tourists into a storm, a cave, and what's under it, and is got out by somebody who can't remember his name. Then
## the Academy: a wand that's awake costs its mage, so they learn to put it away. And a note, where nobody could have left one.

const NAMES3 := ["Far from anywhere", "Weather", "The cave", "What was under it", "Where am I?", "A name", "Pity", "What it costs", "Two weeks", "The Long Dark", "You dropped something", "The cat"]
const TOUR := ["arnold", "hettie", "gus", "dunstan"]
const CAVE := Vector3(300, 40, 0)
const DROP := Vector3(400, 40, 0)
const FIELD := Vector3(60, 0, -60)

# the weather in the Drowse: how much of a storm it is; whether the snow's been told to wait
var storm := 0.0
var storm_to := 0.0
var still := false
var flakes: GPUParticles3D
var flake_m: ParticleProcessMaterial
var mouth_m: ShaderMaterial
var gust := 0.0
# those who follow
var line: Array = []
var crumbs: Array = []
# mana
var mana := 1.0
var mana_on := false
var drain := 0.3
var back := 0.22
var awake := false
var faint := 0.0
var st := {}                          # the staff, awake
var aim = null                        # what it's reaching for
var lamps: Array = []
var force := false                    # (a scene holds it awake, or a test)
# the cat
var cat := {}
var scent: Array = []
var sway_t := 0.0


func list() -> Array: return [e1_far, e2_weather, e3_cave, e4_deep, e5_where, e6_name, e7_pity, e8_costs, e9_weeks, e10_dark, e11_note, e12_cat]


func reset() -> void:
	s.lamps_out = 0.0
	super.reset()
	if is_instance_valid(flakes): flakes.queue_free()
	flakes = null
	storm = 0.0
	storm_to = 0.0
	still = false
	gust = 0.0
	line = []
	crumbs = []
	mana_on = false
	awake = false
	force = false
	faint = 0.0
	st = {}
	lamps = []
	scent = []
	if not cat.is_empty() and cat.has("ghost"): _ghost(cat.ghost, false)
	cat = {}
	s.eye_h = 1.15
	s.cam_dist = 3.4
	s.ui.mana(-1.0)
	if s.stages.has("snow"):
		var b: Dictionary = s.stages["snow"].by_name
		for k in b: if String(k).begins_with("slab_") or String(k).begins_with("camp_"):
			var n: Node3D = b[k]
			if n.has_meta("home"): n.transform = n.get_meta("home")
			n.visible = true


# ------------------------------------------------------------------ weather --
func snow(h: float, wind: float) -> void:
	s.go_place("snow")
	s.hour = h
	s.hour_run = 0.0
	s.main.sound.air("wind")
	storm = wind
	storm_to = wind
	still = false
	if flakes == null or not is_instance_valid(flakes):
		flakes = GPUParticles3D.new()
		flakes.amount = 3200
		flakes.lifetime = 5.0
		flakes.preprocess = 4.0
		flakes.local_coords = false
		flakes.visibility_aabb = AABB(Vector3(-30, -20, -30), Vector3(60, 40, 60))
		flake_m = ParticleProcessMaterial.new()
		flake_m.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
		flake_m.emission_box_extents = Vector3(15, 7, 15)
		flake_m.direction = Vector3(0, -1, 0)
		flake_m.spread = 25.0
		flake_m.initial_velocity_min = 0.4
		flake_m.initial_velocity_max = 1.1
		flake_m.turbulence_enabled = true
		flake_m.turbulence_noise_strength = 0.5
		flake_m.turbulence_noise_scale = 3.0
		flakes.process_material = flake_m
		var m := BoxMesh.new()
		m.size = Vector3.ONE * 0.035
		var mat := StandardMaterial3D.new()
		mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		mat.albedo_color = Color(0.96, 0.98, 1.0)
		m.material = mat
		flakes.draw_pass_1 = m
		flakes.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		s.add_child(flakes)


## Called after the hour's been set: the Drowse's own light, and the white.
func weather_env() -> void:
	var e: Environment = s.main.env
	var k: float = clampf(storm + gust * 0.35, 0.0, 1.2)
	if s.hero and s.hero.position.x > 250.0 or s.main.cam.global_position.x > 250.0:
		e.fog_density = 0.0
		e.ambient_light_color = Color("7f93b8")
		e.ambient_light_energy = 0.42
		s.main.sun.light_energy = 0.0
		e.fog_light_color = Color("0a0d16")
		return
	var white := Color("dfe7f2")
	s.main.sky_mat.sky_top_color = s.main.sky_mat.sky_top_color.lerp(white.darkened(0.12), clampf(k * 1.2, 0.0, 1.0))
	s.main.sky_mat.sky_horizon_color = s.main.sky_mat.sky_horizon_color.lerp(white, clampf(k * 1.3, 0.0, 1.0))
	e.fog_light_color = e.fog_light_color.lerp(white, 0.4 + 0.6 * clampf(k, 0.0, 1.0))
	e.fog_density = lerpf(e.fog_density * 0.7, 0.085, pow(clampf(k, 0.0, 1.2), 1.4))
	s.main.sun.light_energy = lerpf(s.main.sun.light_energy, 0.25, clampf(k, 0.0, 1.0))
	e.ambient_light_energy *= lerpf(1.0, 1.15, clampf(k, 0.0, 1.0))


func _weather_update(dt: float) -> void:
	storm = move_toward(storm, storm_to, dt * 0.28)
	if not is_instance_valid(flakes): return
	var c: Vector3 = s.main.cam.global_position
	var inside: bool = c.x > 250.0
	flakes.emitting = s.place == "snow" and not inside
	flakes.visible = s.place == "snow" and not inside
	if not still: flakes.global_position = c + Vector3(0, 3.0, 0) - s.main.cam.global_basis.z * 5.0
	flakes.speed_scale = 0.0 if still else 1.0 + storm * 0.9 + gust * 0.8
	flakes.amount_ratio = clampf(0.16 + storm * 0.9, 0.0, 1.0)
	flake_m.gravity = Vector3(sin(s.time * 0.5) * (0.6 + storm * 3.0), -1.2 - storm * 1.2, storm * 9.0 + gust * 12.0)


## The white beyond the cave's mouth, going by.
func _mouth_wall() -> void:
	var mi := MeshInstance3D.new()
	var q := PlaneMesh.new()
	q.size = Vector2(7, 5)
	q.orientation = PlaneMesh.FACE_Z
	mi.mesh = q
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode unshaded, cull_disabled;
uniform float dim = 1.0;
float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void fragment() {
	vec2 u = floor(UV * vec2(150.0, 100.0));
	float n = 0.0;
	for (int i = 0; i < 3; i++) { float f = float(i); vec2 q = u * (0.5 + f * 0.35) + vec2(TIME * (40.0 + f * 26.0), TIME * (9.0 + f * 7.0)); n += step(0.93 - f * 0.02, h(floor(q / vec2(5.0, 1.4)))) * (0.5 - f * 0.1); }
	ALBEDO = mix(vec3(0.46, 0.53, 0.64), vec3(0.86, 0.9, 0.96), clamp(n, 0.0, 1.0)) * dim;
}
"""
	mouth_m = ShaderMaterial.new()
	mouth_m.shader = sh
	mi.material_override = mouth_m
	s.add_child(mi)
	a.keep(mi)
	mi.position = CAVE + Vector3(0, 2.0, 6.6)


# ---------------------------------------------------------------- followers --
func follow(names: Array) -> void:
	line = []
	crumbs = []
	for n in names:
		var p: Node3D = act(n)
		line.append(p)
	var h: Node3D = s.hero
	for i in 40: crumbs.append(h.position + Vector3(0, 0, i * 0.34))


func _follow_update(dt: float) -> void:
	if line.is_empty() or s.hero == null or s.mode != "play": return
	if (s.hero.position - crumbs[0] as Vector3).length() > 0.34:
		crumbs.push_front(s.hero.position)
		if crumbs.size() > 60: crumbs.pop_back()
	for i in line.size():
		var p: Node3D = line[i]
		var t_: Vector3 = crumbs[mini(crumbs.size() - 1, 4 + i * 4)]
		var d: Vector3 = t_ - p.position
		d.y = 0.0
		if d.length() > 7.0: p.place(t_, p.yaw)
		elif d.length() > 0.45:
			p.walk_speed = clampf(d.length() * 1.6, 1.0, 4.2)
			p.path = [{ "p": t_, "door": "" }]
		elif not p.path.is_empty(): p.path = []
		p.look = s.hero


# ==================================================================== 1 == --
func e1_far() -> void:
	snow(10.6, 0.02)
	s.film()
	music("drowse")
	var P := at("penny", -0.9, 40.4, 0.35)
	s.hero = P
	P.hold("R", s.prop("stick"), Transform3D(Basis(), Vector3(0, -0.95, 0.04)))
	var A := at("arnold", -1.3, 43.2, PI)
	var H := at("hettie", -0.1, 43.8, PI)
	var Gu := at("gus", 1.1, 43.3, PI)
	var D := at("dunstan", 0.6, 45.4, PI)
	Gu.hold("L", s.prop("book_open"), Transform3D(Basis(Vector3.RIGHT, 0.5) * Basis(Vector3.UP, PI), Vector3(-0.1, -0.02, 0.08)))
	for n in TOUR: act(n).look = P
	s.move(Vector3(-40, 60, 150), Vector3(20, 30, 0), Vector3(-10, 34, 110), Vector3(10, 24, 0), 8.0, 46)
	await s.fade(0.0, 2.0)
	await s.wait(1.0)
	await s.title_card("CHAPTER THREE", "What Is Kept", 4.6)
	s.move(Vector3(14, 9, 62), Vector3(0, 4, 36), Vector3(5.4, 2.6, 49), Vector3(0, 1.4, 42), 5.0, 44)
	s.ui.place("The Drowse. A long way north")
	await s.wait(3.6)
	s.cut(Vector3(0.9, 1.5, 42.4), Vector3(-0.9, 1.3, 40.4), 42)
	P.feel("happy", "grin")
	await s.say("penny", "Good morning, and welcome to Penny's Dragon Walks! The only dragon walk in the Drowse. Which makes it the best.", { "eyes": "happy", "mouth": "grin", "do": "offer2", "d": 2.4 })
	s.face(H, 0.2, 1.4, 38)
	await s.say("hettie", "And is there a dragon?", { "eyes": "open", "mouth": "flat" })
	s.face(P, -0.2, 1.4, 38)
	await s.say("penny", "There's a very great deal of dragon, madam. You're standing on it.", { "eyes": "half", "mouth": "smirk" })
	P.do("pointup", 2.4)
	s.move(Vector3(2.0, 2.0, 46.0), Vector3(14, 14, 10), Vector3(2.6, 2.4, 46.4), Vector3(60, 34, -30), 5.0, 48)
	await s.say("penny", "That long back. Those shoulders. It lay down for a nap when the world was new, and it snowed. That's why nothing up here behaves. Stones run warm. Wands go off in people's pockets.", { "as": "Penny" })
	s.face(A, 0.2, 1.4, 38)
	A.look = D
	A.do("tilt", 1.4)
	await s.say("arnold", "I can hear it breathing!", { "eyes": "wide", "mouth": "oh" })
	s.face(P, -0.2, 1.4, 38)
	await s.say("penny", "That's Mr. Dunstan, sir.", { "eyes": "half", "mouth": "flat" })
	s.face(D, 0.2, 1.5, 38)
	D.do("cough", 1.2)
	await s.say("dunstan", "I've a cold.", { "eyes": "half", "mouth": "frown" })
	s.face(P, 0.2, 1.4, 36)
	await s.say("penny", "Three rules. Stay by the flags. Stay where I can count you. And nobody lights, mixes, pours or throws anything. Mr. Dunstan.", { "eyes": "stern", "mouth": "flat", "do": "point" })
	s.face(D, -0.2, 1.5, 38)
	await s.say("dunstan", "It's a hobby.", { "eyes": "lookL", "mouth": "wavy" })
	s.face(Gu, 0.2, 1.4, 38)
	await s.say("gus", "What if it wakes up?", { "eyes": "wide", "mouth": "smile" })
	s.face(P, -0.2, 1.3, 36)
	await s.say("penny", "Then it's a silver extra.", { "eyes": "happy", "mouth": "grin", "do": "flick" })
	P.drop("R")
	follow(TOUR)
	s.play()
	s.ui.toast("You're Penny. Lead them up by the flags.")
	await _sight(Vector3(1.6, 0, 27.5), "Show them the Tooth", func() -> void:
		s.move(Vector3(0.4, 1.7, 29.4), Vector3(34, 14, 22), Vector3(0.6, 1.8, 29.6), Vector3(34, 16, 22), 4.0, 46)
		await s.say("penny", "The Tooth! Eleven hundred feet, since somebody measured it. And eleven hundred it'll stay, until somebody else does.", { "eyes": "happy", "mouth": "smile", "as": "Penny" })
		s.face(act("hettie"), 0.2, 1.4, 38)
		await s.say("hettie", "It's very clean.", { "eyes": "half", "mouth": "flat" }))
	await _sight(Vector3(7.5, 0, 6.3), "Let them feel the Breathing Stone", func() -> void:
		var P3: Node3D = s.hero
		P3.turn_to(Vector3(8.6, 0, 5.0))
		s.cut(Vector3(6.2, 1.2, 3.0), Vector3(8.2, 0.8, 5.6), 42)
		s.smoke(Vector3(8.6, 0.5, 5.0), 10, false)
		await s.say("penny", "Put your hand over it. Warm as a loaf. It's the dragon breathing out.", { "eyes": "soft", "mouth": "smile" })
		s.face(act("arnold"), 0.2, 1.4, 38)
		act("arnold").do("tilt", 1.2)
		await s.say("arnold", "Out, yes. ...But it hasn't breathed in.", { "eyes": "worry", "mouth": "flat" })
		s.cut(Vector3(9.8, 0.9, 6.6), Vector3(8.6, 0.5, 5.0), 34)
		s.main.sfx("hum", null, -6.0)
		for k in 3:
			s.burst(Vector3(8.6, 0.45, 5.0), Color("e85aa8"), Color("ffb0e0"), 8, 0.8, 0.6, 0.026, 1.4, 26.0)
			await s.wait(0.5)
		s.face(P3, 0.2, 1.3, 34)
		P3.look = Vector3(8.6, 0.5, 5.0)
		await s.say("penny", "It's a hot spring. It's only a hot spring. ...It's never done that.", { "eyes": "worry", "mouth": "small", "as": "Penny, under her breath" })
		P3.look = null)
	await _sight(Vector3(6.6, 0, -2.5), "Show them the Wing", func() -> void:
		s.move(Vector3(5.2, 1.7, 0.4), Vector3(38, 8, -14), Vector3(5.2, 1.7, 0.6), Vector3(38, 12, -14), 4.0, 44)
		await s.say("penny", "And there's the Wing, folded, see the ribs of it, and if you look just past the end you can see all the way to...", { "eyes": "happy", "mouth": "smile", "as": "Penny" })
		storm_to = 0.45
		s.main.sfx("wind")
		await s.wait(1.2)
		s.face(s.hero, 0.2, 1.4, 36)
		await s.say("penny", "...That isn't on the timetable.", { "eyes": "wide", "mouth": "flat" }))
	s.film()
	line = []
	await s.fade(1.0, 0.8)


## A thing to show them on the way: they come up round her, and look.
func _sight(p: Vector3, label: String, f: Callable) -> void:
	s.ui.objective(label)
	var id: int = a.run_id
	await a.use(p, label, 2.2)
	if a.run_id != id: return
	s.film()
	var keep_line := line
	line = []
	var h: Node3D = s.hero
	h.place(p, h.yaw)
	for i in TOUR.size():
		var n: Node3D = act(TOUR[i])
		var an := PI * 0.72 + i * 0.5
		n.path = []
		n.place(Vector3(p.x + sin(an - 1.2) * 1.5, 0, p.z + 1.1 + (i % 2) * 0.75), PI)
		n.place(Vector3(p.x - 1.15 + i * 0.78, 0, p.z + 1.2 + (i % 2) * 0.7), PI)
		n.look = null
	await f.call()
	line = keep_line
	s.play()


# ==================================================================== 2 == --
func e2_weather() -> void:
	snow(11.4, 0.5)
	s.film()
	music("storm")
	var P := at("penny", 6.4, -1.2, PI)
	s.hero = P
	for i in TOUR.size(): at(TOUR[i], 5.4 + (i % 2) * 1.9, 0.6 + i * 0.75, PI).look = P
	s.move(Vector3(9.0, 2.2, -5.4), Vector3(6, 1.2, 1), Vector3(8.2, 1.8, -4.4), Vector3(6.2, 1.2, 0.4), 4.0, 46)
	storm_to = 0.8
	await s.fade(0.0, 0.6)
	s.main.sfx("wind")
	P.face_yaw = 0.0
	await s.wait(0.8)
	s.face(P, 0.2, 1.4, 38)
	await s.say("penny", "Right! Everyone take hold of the one in front. Don't be polite about it!", { "eyes": "stern", "mouth": "shout" })
	s.face(act("dunstan"), 0.2, 1.5, 38)
	await s.say("dunstan", "If I were to mix a very small...", { "eyes": "happy", "mouth": "smile" })
	s.face(P, -0.2, 1.4, 36)
	await s.say("penny", "NO!", { "eyes": "stern", "mouth": "shout" })
	await s.say("penny", "There's a cave at the end of the flags. When it blows, get in behind a stone. When it drops, walk.", { "eyes": "stern", "mouth": "flat" })
	P.face_yaw = PI
	follow(TOUR)
	s.play()
	s.ui.objective("Get them to the cave.  When the gust comes, get behind a standing stone")
	s.ui.toast("The wind's from ahead: the near side of a stone is out of it.")
	var id: int = a.run_id
	var stones: Array = s.stage.data.marks.stones
	s.goal = Vector3(-3.5, 0, -33.6)
	var caught := 0
	var t0: float = s.time
	while a.run_id == id and Vector2(P.position.x + 3.5, P.position.z + 33.6).length() > 2.2:
		# calm, then it gathers, then it comes
		var t1: float = s.time
		while a.run_id == id and s.time < t1 + 4.6 and P.position.z > -31.6:
			if s.main.dev_auto: P.place(P.position.lerp(Vector3(-3.5, 0, -33.6), 0.02) if s.time > t0 + 14.0 else P.position, PI)
			await s.beat()
		if P.position.z <= -31.6:
			await s.beat()
			continue
		s.main.sfx("wind")
		s.ui.bell_text("Here it comes")
		var t2: float = s.time
		while a.run_id == id and s.time < t2 + 1.9:
			gust = move_toward(gust, 0.5, s.dt_last)
			await s.beat()
		s.main.sfx("gust")
		s.shake = 0.6
		var t3: float = s.time
		var hit := false
		while a.run_id == id and s.time < t3 + 3.0:
			gust = move_toward(gust, 1.6, s.dt_last * 3.0)
			var lee := false
			for q in stones: if Vector2(P.position.x - q[0], P.position.z - q[1]).length() < 2.1 and P.position.z > q[1] - 0.3: lee = true
			if not lee and not s.main.dev_auto:
				P.position.z = minf(P.position.z + s.dt_last * 2.4, 2.0)
				P.position = s.stage.collide(P.position, 0.28)
				if not hit:
					hit = true
					caught += 1
					P.do("shield", 2.6)
					P.say_bubble(["Hold ON!", "Down! Get down!", "I've got you! Who've I got?", "Behind the STONES!"][caught % 4], s.campus.font, 2.0)
			await s.beat()
		var t4: float = s.time
		while a.run_id == id and gust > 0.0:
			gust = maxf(0.0, gust - s.dt_last * 1.2)
			if s.time > t4 + 2.5: gust = 0.0
			await s.beat()
	if a.run_id != id: return
	gust = 0.0
	s.goal = null
	s.film()
	line = []
	P.place(Vector3(-3.5, 0, -33.0), PI)
	for i in TOUR.size(): act(TOUR[i]).place(Vector3(-4.2 + (i % 2) * 1.4, 0, -31.4 + i * 0.85), PI)
	P.place(Vector3(-2.3, 0, -33.6), 0.0)
	P.face_yaw = -0.6
	P.do("wave", 3.0)
	s.cut(Vector3(-5.4, 1.7, -35.0), Vector3(-2.9, 1.3, -32.0), 52)
	for i in TOUR.size(): act(TOUR[i]).go_free([Vector3(-3.5, 0, -36.2 + i * 0.4)], 1.9)
	await s.say("penny", "In! In, in, in, in! Mind the icicles!", { "eyes": "stern", "mouth": "shout", "after": 0.0 })
	await s.fade(1.0, 0.8)


# ==================================================================== 3 == --
func e3_cave() -> void:
	snow(13.0, 0.9)
	s.film()
	music("drowse")
	s.main.sound.air("room")
	_mouth_wall()
	_camp(false)
	var P := at("penny", CAVE.x, 3.6, PI, CAVE.y)
	s.hero = P
	var spots := [[-1.5, 2.2], [1.1, 2.6], [1.7, 1.0], [-0.6, 1.0]]
	for i in TOUR.size():
		var t_ := at(TOUR[i], CAVE.x + spots[i][0], spots[i][1], PI * (0.8 + i * 0.1), CAVE.y)
		t_.shiver = 1.0
		t_.look = P
	var L := moon(CAVE + Vector3(0.6, 2.4, 2.6), 1.0, Color("c8d8f4"), 9.0)
	s.cut(CAVE + Vector3(3.6, 1.9, -2.6), CAVE + Vector3(-0.2, 1.2, 2.4), 50)
	await s.fade(0.0, 0.8)
	s.main.sfx("wind", null, -8.0)
	P.do("dust", 1.4)
	await s.wait(1.2)
	s.face(P, 0.2, 1.4, 38)
	P.face_yaw = 0.0
	P.face_yaw = PI
	await s.say("penny", "One. Two. Three. Four. ...And me. I always forget me.", { "eyes": "soft", "mouth": "smile", "do": "point" })
	await s.say("penny", "We'll camp. It'll blow itself out by morning. This is the good bit, really. They charge extra for this at the other place.", { "eyes": "happy", "mouth": "grin" })
	await turned("hettie", P)
	s.face(act("hettie"), 0.2, 1.4, 38)
	await s.say("hettie", "You said you were the only place.", { "eyes": "half", "mouth": "flat" })
	for n in TOUR: act(n).shiver = 0.0
	var id: int = a.run_id
	s.play()
	s.ui.objective("Make camp:  light the stove")
	await a.use(CAVE + Vector3(0, 0, -0.4), "Light the stove", 1.7)
	if a.run_id != id: return
	s.locked = true
	P.turn_to(CAVE + Vector3(0, 0, -0.4))
	P.do("castdo", 1.0)
	await s.wait(0.5)
	s.main.sfx("ignite")
	_camp_part("camp_stove", true)
	s.burst(CAVE + Vector3(0, 0.5, -0.4), Color("ffd24a"), Color("ff7a2a"), 24, 1.2, 1.0, 0.03, 0.9)
	L.light_color = Color("ffb878")
	L.position = CAVE + Vector3(0, 1.4, 0.2)
	await s.wait(0.6)
	s.locked = false
	s.ui.objective("Make camp:  put up the tents")
	await a.use(CAVE + Vector3(-1.9, 0, -3.2), "Put up the tents", 1.8)
	if a.run_id != id: return
	s.locked = true
	P.do("pickup", 1.4)
	for k in ["camp_pack", "camp_tent", "camp_pack2", "camp_tent2", "camp_roll"]:
		s.main.sfx("clunk", null, -10.0)
		_camp_part(k, true)
		await s.wait(0.32)
	s.locked = false
	s.ui.objective("Make camp:  hold the weather out")
	await a.use(CAVE + Vector3(0, 0, 4.4), "Hold the weather out", 1.8)
	if a.run_id != id: return
	# her wand, awake
	s.film()
	P.place(CAVE + Vector3(0, 0, 3.9), 0.0)
	P.hold("R", s.prop("wand_cherry"), GRIP)
	s.cut(CAVE + Vector3(-1.9, 1.7, 5.4), CAVE + Vector3(0.1, 1.2, 3.8), 46)
	await s.wait(0.4)
	P.pose = "cast"
	await s.cast([["So", "U"], ["far", "R"], ["and", "L"], ["not", "D"], ["one", "U"], ["step", "R"], ["more", "D"]], { "gap": 0.72, "wide": 0.28, "name": "A barrier" })
	P.pose = "stand"
	await become("penny")
	s.ui.mana(1.0)
	var sh := _shield(CAVE + Vector3(0, 1.25, 5.7), 1.6)
	s.main.sfx("rune")
	s.cut(CAVE + Vector3(2.2, 1.6, 1.4), CAVE + Vector3(0, 1.4, 5.4), 46)
	mouth_m.set_shader_parameter("dim", 0.6)
	await s.wait(1.2)
	await turned("gus", P)
	s.face(act("gus"), 0.2, 1.4, 38)
	await s.say("gus", "It's a compass! It's enormous!", { "eyes": "wide", "mouth": "grin" })
	s.face(P, 0.2, 1.4, 36)
	await s.say("penny", "It's always known where it was going. It's a relief, when you don't.", { "eyes": "soft", "mouth": "smile" })
	await s.fade(1.0, 0.7)
	# round the stove
	lower("penny")
	_round_stove()
	P.place(CAVE + Vector3(0, 0, 1.25), PI)
	P.pose = "ground"
	var mk := 1.0
	s.ui.mana(0.52)
	s.cut(CAVE + Vector3(2.6, 1.5, 3.2), CAVE + Vector3(0, 0.7, -0.2), 52)
	await s.fade(0.0, 0.8)
	s.ui.place("Some while later")
	await s.wait(2.0)
	s.face(act("gus"), 0.2, 1.4, 38)
	await s.say("gus", "What's it dreaming about, do you think? The dragon.", { "eyes": "soft", "mouth": "small" })
	seat3(P, act("gus"))
	await s.say("penny", "My gran used to say it wasn't asleep at all. She said it was keeping something warm.", { "eyes": "soft", "mouth": "flat" })
	seat3(act("hettie"), P)
	await s.say("hettie", "And how long will that thing hold, dear? You've gone a funny colour. For you.", { "eyes": "half", "mouth": "flat" })
	seat3(P, act("hettie"))
	for k in 12:
		s.ui.mana(0.52 - k * 0.012)
		await s.wait(0.05)
	await s.say("penny", "An hour or two. It isn't the storm, it's the size of the hole. A wand that's awake has to eat, and it eats me.", { "eyes": "half", "mouth": "smile" })
	var D: Node3D = act("dunstan")
	seat3(D, P)
	await s.say("dunstan", "Then permit me! One drop of auracite. A pinch of what I call hyper sand. I call it Stormstop.", { "eyes": "happy", "mouth": "grin" })
	D.stand()
	D.hold("R", s.prop("flask"), Transform3D(Basis(), Vector3(0, -0.1, 0.05)))
	s.main.sfx("chime", null, -8.0)
	seat3(P, D)
	await s.say("penny", "Mr. Dunstan. Put it down. Put it down now.", { "eyes": "wide", "mouth": "flat" })
	s.face(D, 0.2, 1.5, 38)
	await s.say("dunstan", "So that you may put your feet up!", { "eyes": "happy", "mouth": "shout", "do": "toss" })
	drop(D, "R")
	var fl: Node3D = a.keep(s.put("flask", D.hand_pos("R")))
	var p0: Vector3 = fl.position
	var t0: float = s.time
	s.cut(CAVE + Vector3(-2.2, 1.5, -1.0), CAVE + Vector3(0, 1.4, 5.0), 48)
	while s.time < t0 + 0.8:                              # it goes out under the barrier, end over end
		var u: float = (s.time - t0) / 0.8
		fl.position = p0.lerp(CAVE + Vector3(0.4, 0.9, 6.4), u) + Vector3(0, sin(u * PI) * 0.9, 0)
		fl.rotation = Vector3(u * 14.0, 0, u * 6.0)
		await s.beat()
	fl.visible = false
	s.main.sfx("boom")
	s.shake = 1.4
	s.burst(CAVE + Vector3(0, 1.4, 5.9), Color("bfe8ff"), Color("ffffff"), 120, 6.0, -2.0, 0.06, 1.4)
	var plug := _ice_plug()
	sh.visible = false
	s.main.sfx("freeze")
	t0 = s.time
	while s.time < t0 + 0.9:
		plug.scale = Vector3(1, smoothstep(0.0, 0.9, s.time - t0), 1)
		await s.beat()
	mouth_m.set_shader_parameter("dim", 0.12)
	music("")
	await s.wait(1.0)
	s.face(act("arnold"), 0.2, 1.4, 38)
	await s.say("arnold", "...It's gone quiet.", { "eyes": "wide", "mouth": "small" })
	for n in ["gus", "hettie", "arnold"]: act(n).do("clap", 1.4)
	D.do("bow", 1.6)
	P.stand()
	# she can put it away
	s.main.sfx("fizz", null, -6.0)
	drop(P, "R")
	P.hold("R", s.prop("wand_cherry"), GRIP)
	await s.wait(0.6)
	s.face(P, 0.2, 1.4, 38)
	for k in 10:
		s.ui.mana(0.38 + k * 0.004)
		await s.wait(0.05)
	await s.say("penny", "Well. I needn't hold that up any more. And we're corked.", { "eyes": "half", "mouth": "flat" })
	s.face(act("hettie"), 0.2, 1.4, 38)
	await s.say("hettie", "You're a mage. Knock it through.", { "eyes": "open", "mouth": "flat" })
	s.face(P, -0.2, 1.3, 36)
	await s.say("penny", "If I knock that through, the roof comes with it. Nobody shout. Nobody stamp. Nobody so much as...", { "eyes": "stern", "mouth": "flat" })
	var Ar: Node3D = act("arnold")
	Ar.stand()
	await s.wait(0.6)
	s.face(Ar, 0.2, 1.3, 36)
	Ar.look = CAVE + Vector3(0, 5, 0)
	s.main.sfx("crunch", null, -10.0)
	await s.say("arnold", "Shh. ...There's somebody walking. Over our heads.", { "eyes": "wide", "mouth": "small" })
	s.cut(CAVE + Vector3(0.4, 0.7, 1.8), CAVE + Vector3(0, 4.4, -0.6), 56)
	for k in 4:
		s.main.sfx("crunch", null, -5.0 + k)
		s.smoke(CAVE + Vector3(-0.8 + k * 0.5, 4.0, -0.4), 5, false)
		await s.wait(0.75)
	s.main.sfx("crunch")
	await s.wait(0.9)
	s.face(P, 0.2, 1.2, 34)
	await s.say("penny", "Nobody's up there. Nobody could be. It's...", { "eyes": "wide", "mouth": "small" })
	s.face(D, 0.0, 1.2, 34)
	D.feel("squeeze", "oh")
	D.do("shrug", 1.0)
	await s.wait(1.2)
	await s.say("dunstan", "Ah... ah...", { "eyes": "squeeze", "mouth": "oh", "after": 0.0 })
	for n in ["arnold", "gus", "hettie", "penny"]: act(n).feel("wide", "flat")
	D.do("cough", 0.8)
	s.main.sfx("cough")
	await s.say("dunstan", "TCHOO!", { "eyes": "squeeze", "mouth": "shout" })
	music("deep")
	s.main.sfx("crack")
	s.shake = 1.0
	s.cut(CAVE + Vector3(4.0, 3.2, 3.4), CAVE + Vector3(0, 0.2, 0), 54)
	await s.wait(0.9)
	s.main.sfx("crack")
	var b: Dictionary = s.stage.by_name
	for i in 30:
		var n: Node3D = b.get("slab_%d" % i)
		if n and not n.has_meta("home"): n.set_meta("home", n.transform)
	for i in [0, 4, 9, 20, 25, 29, 1, 24]: _fall(b.get("slab_%d" % i), randf() * 0.4)
	s.face(P, 0.1, 1.4, 38)
	await s.say("penny", "TO ME! EVERYONE, TO ME!", { "eyes": "stern", "mouth": "shout", "after": 0.0 })
	drop(P, "R")
	P.hold("R", form("penny"), GRIP)
	raise("penny")
	s.main.sfx("become")
	var by: Array = TOUR.duplicate()                       # (each to the side of her they're on, so nobody crosses anybody)
	var ang := func(q: String) -> float: return atan2(act(q).position.x - P.position.x, act(q).position.z - P.position.z)
	by.sort_custom(func(x, y): return ang.call(x) < ang.call(y))
	var a0: float = ang.call(by[0])
	for i in by.size():
		var n: Node3D = act(by[i])
		n.stand()
		n.go_free([P.position + Vector3(sin(a0 + i * 1.57) * 0.85, 0, cos(a0 + i * 1.57) * 0.85)], 3.4)
		n.feel("wide", "shout")
	s.cut(CAVE + Vector3(3.2, 2.2, 3.4), P.position + Vector3(0, 0.8, 0), 50)
	await s.wait(0.8)
	var bub := _bubble(P.position + Vector3(0, 0.9, 0), 1.7)
	s.main.sfx("crack")
	s.main.sfx("boom")
	s.shake = 2.0
	for i in 30: _fall(b.get("slab_%d" % i), randf() * 0.5)
	for k in ["camp_stove", "camp_tent", "camp_tent2", "camp_pack", "camp_pack2", "camp_roll"]: _fall(b.get(k), 0.25 + randf() * 0.3)
	t0 = s.time
	while s.time < t0 + 1.9:
		var q: float = maxf(0.0, s.time - t0 - 0.35)
		var dy: float = -0.5 * 9.0 * q * q
		for n in ["penny"] + TOUR:
			var m: Node3D = act(n)
			m.stage = null
			m.position.y = CAVE.y + dy
			m.prev_pos = m.position
		bub.position.y = CAVE.y + 0.9 + dy
		await s.beat()
	await s.fade(1.0, 0.25)
	for n in ["penny"] + TOUR: act(n).stage = s.stage
	ups = {}
	s.ui.mana(-1.0)


func seat3(p: Node3D, o: Node3D) -> void:
	p.look = o
	s.face(p, 0.2, 1.35, 40)


func _camp(on: bool) -> void:
	for k in ["camp_tent", "camp_tent2", "camp_pack", "camp_pack2", "camp_roll"]: _camp_part(k, on)


func _camp_part(k: String, on: bool) -> void:
	var n: Node3D = s.stage.by_name.get(k)
	if n == null: return
	if not n.has_meta("home"): n.set_meta("home", n.transform)
	n.visible = on
	if on:
		var h: Transform3D = n.get_meta("home")
		n.transform = h
		var t0: float = s.time
		while s.time < t0 + 0.25:
			n.scale = Vector3.ONE * (0.4 + 0.6 * smoothstep(0.0, 0.25, s.time - t0))
			await s.beat()
		n.transform = h


func _round_stove() -> void:
	var c := CAVE + Vector3(0, 0, -0.4)
	for i in TOUR.size():
		var an: float = [-1.2, 2.45, 1.2, -2.45][i]
		var p: Node3D = act(TOUR[i])
		p.place(c + Vector3(sin(an) * 1.65, 0, cos(an) * 1.65), an + PI)
		p.pose = "ground"
		p.look = c + Vector3(0, 0.6, 0)


## A slab or a tent goes: it drops, turning.
func _fall(n: Node3D, wait_: float) -> void:
	if n == null or n.has_meta("gone"): return
	if not n.has_meta("home"): n.set_meta("home", n.transform)
	n.set_meta("gone", true)
	await s.wait(wait_)
	s.main.sfx("clunk", null, -6.0)
	s.smoke(n.global_position + Vector3(1.2, 0.1, 1.2), 5, false)
	var v := 0.0
	var ax := Vector3(randf_range(-1, 1), 0.1, randf_range(-1, 1)).normalized()
	var w := randf_range(0.3, 1.1)
	var id: int = a.run_id
	while a.run_id == id and n.position.y > CAVE.y - 24.0:
		v += 9.81 * s.dt_last
		n.position.y -= v * s.dt_last
		n.rotate(ax, w * s.dt_last)
		await s.beat()
	n.visible = false
	n.remove_meta("gone")


func _glass(r: float, c: Color, al: float) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = r
	sm.height = r * 2.0
	sm.radial_segments = 24
	sm.rings = 12
	mi.mesh = sm
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode unshaded, cull_disabled, depth_draw_never, blend_add;
uniform vec4 col : source_color; uniform float al;
void fragment() {
	float f = pow(1.0 - abs(dot(NORMAL, VIEW)), 2.2);
	float g = step(0.9, fract(UV.x * 16.0)) + step(0.88, fract(UV.y * 10.0 + TIME * 0.25));
	ALBEDO = col.rgb; ALPHA = al * (0.12 + f * 0.7 + clamp(g, 0.0, 1.0) * 0.3);
}
"""
	var m := ShaderMaterial.new()
	m.shader = sh
	m.set_shader_parameter("col", c)
	m.set_shader_parameter("al", al)
	mi.material_override = m
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	s.add_child(mi)
	a.keep(mi)
	return mi


func _bubble(p: Vector3, r: float) -> MeshInstance3D:
	var mi := _glass(r, Color("ffd27a"), 0.7)
	mi.position = p
	return mi


func _shield(p: Vector3, r: float) -> MeshInstance3D:
	var mi := _glass(r, Color("ffd27a"), 0.8)
	mi.position = p
	mi.scale = Vector3(1.15, 1.0, 0.12)
	return mi


func _ice_plug() -> Node3D:
	var root := Node3D.new()
	s.add_child(root)
	a.keep(root)
	root.position = CAVE + Vector3(0, 0, 5.5)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color("9cc8e8")
	mat.roughness = 0.2
	for i in 34:
		var mi := MeshInstance3D.new()
		var bm := BoxMesh.new()
		bm.size = Vector3(randf_range(0.4, 0.9), randf_range(0.5, 1.2), randf_range(0.4, 0.8))
		mi.mesh = bm
		mi.material_override = mat
		root.add_child(mi)
		mi.position = Vector3(randf_range(-1.7, 1.7), randf_range(0.2, 2.6), randf_range(-0.2, 0.4))
		mi.rotation = Vector3(randf_range(-0.2, 0.2), randf() * 0.6, randf_range(-0.2, 0.2))
	return root


# ==================================================================== 4 == --
func e4_deep() -> void:
	snow(13.5, 0.9)
	s.film()
	music("deep")
	s.main.sound.air("room")
	var P := at("penny", DROP.x, -5.0, 0.0, DROP.y)
	s.hero = P
	var ring_ := [[-0.8, -5.6], [0.8, -5.6], [0.75, -4.3], [-0.75, -4.2]]
	for i in TOUR.size(): at(TOUR[i], DROP.x + ring_[i][0], ring_[i][1], i * 1.5, DROP.y)
	P.hold("R", form("penny"), GRIP)
	raise("penny")
	var bub := _bubble(P.position + Vector3(0, 0.9, 0), 1.8)
	var key := moon(DROP + Vector3(0, 5.5, 1.0), 1.1, Color("bcd0f4"), 14.0)
	for n in ["penny"] + TOUR:
		act(n).stage = null
		act(n).feel("squeeze", "shout")
	# down they come, in the light of it
	s.cut(DROP + Vector3(4.5, 1.2, 1.5), DROP + Vector3(0, 12, -4.6), 56)
	s.shot.l1 = DROP + Vector3(0, 0.9, -5.0)
	s.shot.d = 1.5
	var t0: float = s.time
	s.fader = 0.0
	s.fader_to = 0.0
	while s.time < t0 + 1.5:
		var u: float = (s.time - t0) / 1.5
		var y: float = DROP.y + 26.0 * (1.0 - u * u)
		for n in ["penny"] + TOUR:
			act(n).position.y = y
			act(n).prev_pos = act(n).position
		bub.position.y = y + 0.9
		await s.beat()
	s.main.sfx("thump")
	s.main.sfx("chime")
	s.shake = 1.6
	for n in ["penny"] + TOUR:
		act(n).position.y = DROP.y
		act(n).stage = s.stage
		act(n).do("flinch", 0.8)
	s.burst(P.position + Vector3(0, 0.4, 0), Color("ffe0a0"), Color("ffffff"), 70, 4.0, -3.0, 0.04, 1.0)
	bub.visible = false
	lower("penny")
	for n in TOUR: act(n).pose = "ground"
	P.pose = "kneel"
	s.ui.mana(0.3)
	await s.wait(1.2)
	s.cut(DROP + Vector3(2.4, 1.5, -2.6), DROP + Vector3(0, 0.7, -5.0), 48)
	await s.say("penny", "One. Two. Three. ...Four.", { "eyes": "worry", "mouth": "flat" })
	P.look = act("dunstan")
	act("dunstan").look = P
	s.face(act("dunstan"), 0.2, 1.4, 38)
	await s.say("dunstan", "And you, my dear.", { "eyes": "sad", "mouth": "wavy" })
	s.face(P, 0.2, 1.2, 36)
	await s.say("penny", "...And me.", { "eyes": "soft", "mouth": "smile" })
	P.pose = "stand"
	s.cut(DROP + Vector3(3.4, 0.9, -0.6), DROP + Vector3(0.8, 30, 0.8), 46)
	await s.say("gus", "That's where we were. Up there. That little light.", { "as": "Gus" })
	for n in TOUR: act(n).stand()
	var Ar: Node3D = act("arnold")
	await s.wait(0.7)
	await turned("arnold", DROP + Vector3(0, 6, -8))
	s.face(Ar, 0.2, 1.4, 38)
	await s.say("arnold", "I don't want to alarm anybody. But that isn't rock.", { "eyes": "wide", "mouth": "small" })
	s.move(DROP + Vector3(5.2, 1.6, 2.6), DROP + Vector3(-1, 2.0, -6), DROP + Vector3(7.0, 4.0, 5.4), DROP + Vector3(-1, 5.4, -6), 6.0, 60)
	s.main.sfx("hum")
	await s.wait(3.4)
	await turned("hettie", DROP + Vector3(0, 6, -8))
	s.face(act("hettie"), 0.2, 1.4, 38)
	await s.say("hettie", "Well. I did ask.", { "eyes": "wide", "mouth": "flat" })
	# the hollow
	P.look = null
	s.play()
	s.ui.mana(0.3)
	s.ui.objective("Look at the light in the ice")
	var id: int = a.run_id
	await a.use(DROP + Vector3(3.4, 0, -5.6), "Look closer", 1.7)
	if a.run_id != id: return
	s.film()
	P.place(DROP + Vector3(3.0, 0, -5.2), 2.4)
	s.cut(DROP + Vector3(4.8, 1.6, -3.5), DROP + Vector3(3.35, 1.0, -5.7), 58)
	await s.wait(0.8)
	await s.say("penny", "Something's melted it. From the inside. That's a shoulder. That's... somebody's been lying here.", { "eyes": "wide", "mouth": "small" })
	P.reach.R = DROP + Vector3(3.9, 0.7, -6.0)
	P.hand.R = "open"
	s.burst(DROP + Vector3(4.1, 0.7, -6.2), Color("e85aa8"), Color("ffb0e0"), 10, 0.6, 0.4, 0.026, 1.4)
	await s.wait(0.9)
	s.face(P, 0.3, 1.3, 36)
	await s.say("penny", "It's still warm.", { "eyes": "wide", "mouth": "flat" })
	P.reach.R = null
	P.hand.R = ""
	# it's not done falling
	s.main.sfx("crack")
	s.shake = 1.0
	var Gu: Node3D = act("gus")
	Gu.place(DROP + Vector3(0.2, 0, -2.6), PI)
	Gu.feel("wide", "shout")
	Gu.do("leap", 1.0)
	s.cut(DROP + Vector3(2.4, 1.7, -6.2), DROP + Vector3(0.2, 0.95, -2.8), 52)
	await s.say("gus", "It's moving! The edge is MOVING!", { "eyes": "wide", "mouth": "shout", "after": 0.0 })
	P.place(DROP + Vector3(1.2, 0, -5.4), 0.0)
	for i in TOUR.size(): act(TOUR[i]).go_free([DROP + Vector3(-1.5 + i * 0.85, 0, -6.6 + (i % 2) * 0.5)], 2.8)
	await s.wait(0.7)
	raise("penny")
	P.held.R.visible = true
	s.main.sfx("become")
	s.face(P, 0.1, 1.5, 40)
	await s.say("penny", "Behind me! I can hold it. I can hold it.", { "eyes": "stern", "mouth": "shout" })
	var m := 0.3
	var sh := _glass(1.0, Color("ffd27a"), 0.8)
	sh.position = DROP + Vector3(0, 0.1, -4.6)
	sh.scale = Vector3(4.2, 0.35, 3.2)
	s.cut(DROP + Vector3(3.8, 2.4, -0.6), DROP + Vector3(0.2, 0.5, -4.8), 50)
	P.pose = "cast"
	for k in 3:                                          # three holds, each shorter of breath
		var words: Array = [[["Stay", "U"], ["stay", "L"], ["stay", "R"], ["where", "D"], ["you're", "U"], ["put", "L"]], [["One", "R"], ["more", "L"], ["only", "U"], ["one", "D"], ["more", "R"], ["please", "U"]], [["I", "L"], ["said", "R"], ["I", "U"], ["would", "D"], ["get", "L"], ["them", "U"], ["home", "R"]]][k]
		var r: float = await s.cast(words, { "gap": 0.74 - k * 0.1, "wide": 0.3 - k * 0.04, "name": ["Hold it", "Hold it", "...Hold it"][k] })
		m = maxf(0.0, m - 0.1)
		s.ui.mana(m)
		s.main.sfx("crack", null, -4.0)
		s.shake = 0.8 + k * 0.4
		sh.material_override.set_shader_parameter("al", 0.8 - k * 0.22)
		s.burst(DROP + Vector3(randf_range(-2, 2), 0.1, -2.6), Color("8a94a8"), Color("dfe8f4"), 18, 1.6, -8.0, 0.06, 0.9)
		await s.wait(0.5)
	# and it goes out
	s.ui.mana(0.0)
	P.pose = "stand"
	sh.visible = false
	lower("penny")
	s.main.sfx("fizz")
	drop(P, "R")
	P.hold("R", s.prop("wand_cherry"), GRIP)
	s.smoke(P.hand_pos("R"), 8, false)
	P.pose = "kneel"
	P.feel("sad", "wavy")
	music("")
	await s.wait(0.7)
	s.face(P, 0.2, 1.3, 36)
	await s.wait(1.2)
	await s.say("penny", "That's me. That's all of me. I'm sorry. I'm so sorry. I always count.", { "eyes": "sad", "mouth": "wavy" })
	s.main.sfx("crack")
	s.shake = 1.6
	key.light_energy = 0.5
	await s.wait(0.8)
	# above
	music("still")
	var E := at("erebus", DROP.x + 1.5, 1.0, PI, DROP.y + 29.2)
	E.stage = null
	E.position = DROP + Vector3(1.5, 28.6, 0.6)
	E.prev_pos = E.position
	E.look = P.position
	var rim := moon(DROP + Vector3(1.5, 33.0, 3.4), 3.0, Color("e8f0ff"), 14.0)
	s.cut(DROP + Vector3(3.6, 1.0, -0.2), DROP + Vector3(1.5, 29.4, 0.6), 20)
	await s.wait(2.6)
	s.face(act("arnold"), 0.1, 1.3, 36)
	await s.say("arnold", "There's someone there.", { "eyes": "wide", "mouth": "small" })
	s.cut(DROP + Vector3(1.6, 27.0, 2.2), DROP + Vector3(1.5, 29.8, 0.6), 34)
	await s.wait(1.8)
	s.cut(DROP + Vector3(1.0, 29.8, -0.9), DROP + Vector3(1.5, 29.95, 0.6), 34)
	E.feel("half", "flat")
	await s.wait(1.6)
	E.reach.R = E.position + Vector3(0, 0.75, -0.75)
	E.hand.R = "open"
	await s.wait(1.0)
	s.cut(P.position + Vector3(0.9, 1.25, 1.1), P.position + Vector3(0.05, 1.0, 0.15), 46)
	P.look = DROP + Vector3(1.5, 29, 0.6)
	P.feel("wide", "small")
	await s.say("penny", "It's forty yards. You can't...", { "eyes": "wide", "mouth": "small" })
	# the part in between, taken out
	P.reach.R = P.position + Vector3(0.15, 1.15, 0.45)
	E.place(P.position + Vector3(0.25, 0.0, 1.05), PI)
	E.position.y = DROP.y + 0.55
	E.prev_pos = E.position
	E.reach.R = P.position + Vector3(0.15, 1.2, 0.5)
	s.main.sfx("blink")
	s.burst(P.position + Vector3(0.15, 1.15, 0.45), Color("c22850"), Color("2a1830"), 40, 2.4, 0.0, 0.03, 1.0)
	s.cut(P.position + Vector3(1.1, 1.3, 0.7), P.position + Vector3(0.18, 1.12, 0.5), 26)
	await s.wait(1.6)
	s.main.sfx("blink")
	await s.fade(1.0, 0.3, Color.WHITE)
	E.stage = s.stage
	s.ui.mana(-1.0)
	drop(P, "R")


# ==================================================================== 5 == --
func e5_where() -> void:
	snow(14.2, 0.35)
	s.film()
	s.fader_c = Color.WHITE
	music("still")
	s.main.sound.air("")
	var F := FIELD
	var E := at("erebus", F.x + 0.4, F.z + 3.4, 0.0)
	var P := at("penny", F.x - 0.6, F.z + 5.4, PI)
	s.hero = P
	var sp := [[-2.0, 5.2], [0.9, 6.2], [-1.4, 6.6], [2.0, 5.2]]
	for i in TOUR.size():
		var t_ := at(TOUR[i], F.x + sp[i][0], F.z + sp[i][1], PI + (i - 1.5) * 0.25)
		t_.pose = "ground"
		t_.look = E
	P.pose = "kneel"
	P.look = E
	s.cut(F + Vector3(6.5, 3.4, 12), F + Vector3(0, 1.2, 3.6), 46)
	s.shot.p1 = F + Vector3(4.4, 2.4, 10)
	s.shot.d = 6.0
	for k in 6:                                          # (let the snow fill the air, and then)
		await s.beat()
	await s.wait(0.2)
	await s.fade(0.0, 1.6, Color.WHITE)
	still = true
	s.fader_c = Color.BLACK
	await s.wait(2.6)
	s.face(act("arnold"), 0.2, 1.4, 38)
	await s.say("arnold", "The wind's stopped.", { "eyes": "wide", "mouth": "small" })
	var H: Node3D = act("hettie")
	H.stand()
	H.reach.R = H.position + Vector3(0.1, 1.4, -0.35)
	H.hand.R = "point"
	await s.wait(0.6)
	s.face(H, 0.2, 1.4, 38)
	await s.say("hettie", "It hasn't stopped. It's... waiting.", { "eyes": "wide", "mouth": "flat" })
	H.reach.R = null
	H.hand.R = ""
	s.face(E, 0.3, 1.6, 36)
	E.look = P
	await s.say("erebus", "I asked it to. You were all shouting.", { "as": "The boy", "eyes": "half", "mouth": "flat" })
	P.pose = "stand"
	await s.wait(0.6)
	s.face(P, -0.2, 1.4, 36)
	await s.say("penny", "I watched your arm. It's forty yards. Your arm didn't get any longer.", { "eyes": "wide", "mouth": "small" })
	s.two(E, P, 1.0, 2.8, 40, 0.1)
	await s.say("erebus", "You were there, and I was here. I took out the part in between.", { "as": "The boy", "eyes": "open", "mouth": "flat" })
	s.face(act("gus"), 0.2, 1.4, 38)
	await s.say("gus", "He's got no shoes on.", { "eyes": "wide", "mouth": "small" })
	s.move(F + Vector3(2.5, 1.0, 3.9), E.position + Vector3(0, 1.2, 0), F + Vector3(2.3, 1.3, 4.3), E.position + Vector3(0, 1.35, 0), 4.0, 42)
	E.look = null
	E.do("look", 2.4)
	await s.wait(2.4)
	s.face(E, 0.25, 1.5, 38)
	await s.say("erebus", "Where am I?", { "as": "The boy", "eyes": "sad", "mouth": "small" })
	s.face(P, -0.2, 1.4, 36)
	await s.say("penny", "The Drowse. North of everything. Who ARE you?", { "eyes": "worry", "mouth": "flat" })
	s.face(E, 0.2, 1.4, 34)
	E.look = P
	await s.say("erebus", "I'm sorry. I don't know this place, or any of you. ...You're cold. Where is it that you're warm?", { "as": "The boy", "eyes": "half", "mouth": "flat" })
	s.face(P, -0.2, 1.4, 36)
	await s.say("penny", "There's a hut. At the bottom, where the flags start. It's five hours down, with the rope, if nobody...", { "eyes": "worry", "mouth": "flat" })
	E.go_free([P.position + Vector3(0.25, 0, -0.75)], 1.1)
	await s.until(func(): return E.path.is_empty(), 4.0)
	E.turn_to(P)
	s.two(E, P, 1.0, 2.2, 38, 0.1)
	E.reach.R = P.position + Vector3(0.18, 1.18, -0.05)
	E.hand.R = "open"
	await s.wait(0.9)
	s.main.sfx("blink")
	await s.fade(1.0, 0.12, Color.WHITE)
	# the foot of the mountain
	E.reach.R = null
	E.hand.R = ""
	still = false
	storm = 0.0
	storm_to = 0.06
	E.place(Vector3(0.5, 0, 41.0), PI * 0.1)
	P.place(Vector3(-0.4, 0, 42.4), PI * 0.9)
	for i in TOUR.size(): act(TOUR[i]).place(Vector3(-1.4 + i * 1.0, 0, 44.0 + (i % 2) * 0.7), PI)
	for n in TOUR: act(n).pose = "stand"
	s.cut(Vector3(4.6, 1.9, 47.6), Vector3(0, 1.1, 42.6), 46)
	music("drowse")
	s.main.sound.air("wind")
	await s.fade(0.0, 0.5, Color.WHITE)
	s.fader_c = Color.BLACK
	await s.wait(0.8)
	var D: Node3D = act("dunstan")
	for n in ["dunstan", "gus", "arnold"]:
		act(n).pose = "crouch"
		act(n).feel("squeeze", "wavy")
	await s.wait(0.7)
	s.face(D, 0.2, 1.5, 38)
	await s.say("dunstan", "Whatever that was, lad. I beg you. Never again.", { "eyes": "squeeze", "mouth": "wavy" })
	s.face(H, 0.2, 1.4, 38)
	await s.say("hettie", "Again!", { "eyes": "happy", "mouth": "grin", "do": "clap" })
	s.face(P, 0.2, 1.4, 36)
	P.look = E
	P.feel("wide", "small")
	await s.wait(1.0)
	await s.say("penny", "There are six lamps. Spark, Candle, Lantern, Hearth, Beacon, Star. I've a certificate for the third.", { "eyes": "wide", "mouth": "flat" })
	await s.say("penny", "There isn't a lamp for that.", { "eyes": "wide", "mouth": "small" })
	s.face(E, 0.2, 1.3, 34)
	E.look = P
	await s.say("erebus", "...Lamp?", { "as": "The boy", "eyes": "open", "mouth": "flat" })
	s.face(P, -0.2, 1.3, 36)
	await s.say("penny", "Magic. That was magic!", { "eyes": "stern", "mouth": "open" })
	s.face(E, 0.2, 1.2, 32)
	await s.say("erebus", "Ma... gic.", { "as": "The boy", "eyes": "half", "mouth": "small" })
	s.face(P, -0.2, 1.3, 36)
	await s.say("penny", "And every mage between here and the sea has just sat up in bed.", { "eyes": "worry", "mouth": "flat" })
	await s.fade(1.0, 0.8)
	# and so they have
	s.leave("penny")
	for n in TOUR + ["erebus"]: act(n).visible = false
	s.hero = null
	s.go_place("academy")
	a._campus_busy(23.2)
	for p in s.campus.people:
		p.busy = true
		p.a.visible = false
	a.ch1.levelled = true
	a.ch1.board(26, true)
	s.main.sound.air("room")
	music("")
	a.ch1.lean = Vector2.ZERO
	s.cut(Vector3(3.2, 1.6, -18.0), Vector3(4.3, 1.5, -19.2), 30)
	await s.fade(0.0, 0.6)
	s.main.sfx("chime", null, -8.0)
	var t0: float = s.time
	while s.time < t0 + 2.0:
		a.ch1.lean = Vector2(0.1, -0.9) * smoothstep(0.0, 1.2, s.time - t0)
		await s.beat()
	var Au := at("aurel", -8.5, -18.4, PI, FY[2])
	Au.feel("wide", "flat")
	moon(Vector3(-8.0, FY[2] + 2.2, -19.4), 0.8)
	s.face(Au, 0.4, 1.5, 36)
	await s.wait(1.8)
	s.main.sound.air("night")
	Au.visible = false
	var tt := tt_at(Vector3(12.0, 11.25, -6.3), PI, false)
	s.main.tt_pin = 11.25
	s.main.tt.face_base = "surprised"
	moon(Vector3(13.4, 13.6, -4.4), 1.2, Color("c8d4ff"), 7.0)
	s.move(Vector3(14.2, 12.2, -3.4), Vector3(12.0, 12.45, -6.3), Vector3(14.6, 12.6, -4.2), Vector3(12.0, 12.5, -6.3), 3.0, 40)
	await s.wait(2.8)
	tt_gone()
	s.main.tt_pin = NAN
	a.ch1.lean = Vector2.ZERO
	await s.fade(1.0, 0.8)
	a._free_people()


# ==================================================================== 6 == --
func e6_name() -> void:
	snow(16.4, 0.05)
	s.film()
	music("still")
	var sx: float = s.stage.data.marks.stump[0]
	var sz: float = s.stage.data.marks.stump[1]
	var P := at("penny", 3.4, 43.2, PI / 2)
	s.hero = P
	var E := at("erebus", 2.3, 43.0, PI / 2)
	P.reach.L = E.position + Vector3(0.28, 0.82, 0.1)
	for i in TOUR.size(): at(TOUR[i], -1.6 + i * 0.95, 46.6 + (i % 2) * 0.6, PI * 0.75)
	s.cut(Vector3(7.6, 1.7, 47.2), Vector3(3.0, 1.1, 43.2), 44)
	await s.fade(0.0, 0.9)
	P.go_free([Vector3(5.9, 0, 43.0)], 1.2)
	E.go_free([Vector3(4.8, 0, 42.8)], 1.2)
	var t0: float = s.time
	while s.time < t0 + 2.2:
		P.reach.L = E.hand_pos("R")
		E.reach.R = P.hand_pos("L").lerp(E.position + Vector3(0.3, 0.85, 0), 0.5)
		await s.beat()
	P.path = []
	E.path = []
	P.reach.L = null
	E.reach.R = null
	P.place(Vector3(6.1, 0, 42.4), 0.0)
	E.place(Vector3(6.5, 0, 43.8), PI)
	P.look = E
	E.look = P
	s.two(P, E, 1.0, 2.4, 40, 0.1)
	await s.say("penny", "Out of their hearing. Now. What's the last thing you remember?", { "eyes": "stern", "mouth": "flat" })
	s.face(E, 0.25, 1.4, 36)
	await s.say("erebus", "I was standing in Valeria. Only there wasn't any Valeria. There wasn't any anything, in any direction, as far as I could see.", { "as": "The boy", "eyes": "half", "mouth": "flat" })
	await s.say("erebus", "And then it was white, and there was something on top of me, and it was warm.", { "as": "The boy", "eyes": "down", "mouth": "small" })
	s.face(P, -0.25, 1.4, 36)
	P.do("shake", 0.8)
	await s.say("penny", "Valeria. Valeria. I know that. Where do I know that...", { "eyes": "lookL", "mouth": "flat" })
	await s.wait(0.6)
	P.feel("wide", "small")
	await s.say("penny", "It's in the history books. It's on the first page. It's what there was before anybody lit the candle. That's three hundred years ago.", { "eyes": "wide", "mouth": "small" })
	P.do("point", 2.4)
	P.shiver = 0.8
	await s.say("penny", "How are you not DEAD?", { "eyes": "wide", "mouth": "shout" })
	P.shiver = 0.0
	# he sits down
	P.place(Vector3(sx - 1.3, 0, sz - 1.9), 0.5)
	E.go_free([Vector3(sx, 0, sz - 0.42)], 1.0)
	s.cut(Vector3(sx + 2.3, 1.3, sz - 2.2), Vector3(sx - 0.2, 0.95, sz - 0.6), 44)
	await s.until(func(): return E.path.is_empty(), 3.0)
	E.path = []
	E.place(Vector3(sx, 0, sz - 0.12), PI)
	E.sit(0.42, "sit")
	E.look = null
	E.feel("down", "flat")
	await s.say("erebus", "Three hundred years.", { "as": "The boy", "eyes": "down", "mouth": "small" })
	seat_face(E, 1.25, 36)
	await s.say("erebus", "I thought he'd kill me. He only put me to sleep.", { "as": "The boy", "eyes": "sad", "mouth": "flat" })
	await s.say("erebus", "...So it's true, then. I can't.", { "as": "The boy", "eyes": "shut", "mouth": "flat" })
	P.place(Vector3(sx - 0.3, 0, sz - 1.7), 0.15)
	s.face(P, 0.2, 1.4, 36)
	await s.say("penny", "You can't what?", { "eyes": "worry", "mouth": "flat" })
	seat_face(E, 1.25, 36)
	E.look = P
	await s.say("erebus", "Nothing. It's very bright here.", { "as": "The boy", "eyes": "half", "mouth": "smile" })
	s.face(P, 0.2, 1.4, 36)
	await s.say("penny", "Well, if you're three hundred, you ought to look a good deal worse.", { "eyes": "half", "mouth": "smirk", "do": "nod" })
	# he gets up and does it properly
	E.stand()
	E.place(Vector3(sx, 0, sz - 0.55), PI)
	s.cut(Vector3(sx + 2.0, 1.4, sz - 2.4), Vector3(sx - 0.1, 1.15, sz - 1.0), 42)
	E.do("bow", 2.0)
	await s.wait(1.4)
	await s.say("erebus", "Forgive me. I've been rude. My name is...", { "as": "The boy", "eyes": "soft", "mouth": "smile" })
	music("")
	s.face(E, 0.2, 1.3, 34)
	E.feel("open", "open")
	await s.wait(1.6)
	E.feel("wide", "small")
	await s.wait(1.2)
	await s.say("erebus", "...It was here. I had it a moment ago.", { "as": "The boy", "eyes": "sad", "mouth": "small" })
	s.face(P, -0.2, 1.4, 36)
	await s.say("penny", "How convenient.", { "eyes": "half", "mouth": "frown" })
	P.do("sigh", 1.4)
	await s.wait(1.0)
	music("still")
	await s.say("penny", "Fine. I can't write \"boy\" in the register. You'll have to have one of mine.", { "eyes": "stern", "mouth": "flat" })
	P.go_free([Vector3(sx - 0.12, 0, sz - 1.32)], 0.9)
	await s.until(func(): return P.path.is_empty(), 2.5)
	await open_two(P, E, 1.0, 2.0, 40)
	await s.wait(0.8)
	P.do("tilt", 1.6)
	await s.wait(0.8)
	s.face(P, -0.25, 1.2, 34)
	await s.say("penny", "Erebus.", { "eyes": "half", "mouth": "smile" })
	s.face(E, 0.2, 1.2, 32)
	E.feel("wide", "small")
	await s.wait(1.4)
	await open_two(P, E, 1.0, 1.9, 40)
	await s.say("penny", "It's an old word for the dark. It's for the hair. There's a stupid amount of it. Some of us have to get up at five.", { "eyes": "lookL", "mouth": "frown" })
	var k: int = await s.ask([["0", "\"It suits you.\""], ["1", "\"It'll do, till you find the old one.\""]])
	a.flag.penny_name = k
	s.face(P, -0.25, 1.2, 34)
	await s.say("penny", "It suits you. Don't let it go to your head. There's no room." if k == 0 else "It'll do, till you find the old one. You can give it me back.", { "eyes": "soft", "mouth": "smile" })
	s.face(E, 0.2, 1.2, 32)
	await s.say("erebus", "Erebus.", { "as": "Erebus", "eyes": "half", "mouth": "small" })
	await s.wait(0.6)
	E.feel("soft", "smile")
	await s.say("erebus", "Thank you. I'll keep it.", { "as": "Erebus", "eyes": "soft", "mouth": "smile" })
	s.move(Vector3(sx - 3.2, 1.7, sz - 3.6), Vector3(sx, 1.2, sz - 0.9), Vector3(0.0, 8.5, 27.0), Vector3(sx - 1.0, 2.0, sz), 7.0, 46)
	await s.wait(5.0)
	await s.fade(1.0, 1.8)
	for n in TOUR + ["penny", "erebus"]: act(n).visible = false


# --------------------------------------------------------------------- mana --
func mana_start(d: float, b: float) -> void:
	mana = 1.0
	mana_on = true
	drain = d
	back = b
	faint = 0.0
	s.ui.mana(1.0)
	var R: Node3D = s.hero
	if R.held.R == null: R.hold("R", s.prop("wand_black"), GRIP)


func mana_stop() -> void:
	mana_on = false
	_wake(false, true)
	s.ui.mana(-1.0)
	lamps = []


## His baton wakes into the staff, or goes back to being a baton.
func _wake(on: bool, quiet := false) -> void:
	if on == awake: return
	awake = on
	var R: Node3D = s.hero
	if on:
		if R.held.R: R.held.R.visible = false
		st = staff_make(R.position)
		var gr := Node3D.new()
		st.root.add_child(gr)
		var gl := Node3D.new()
		st.root.add_child(gl)
		st.grip = gr
		st.grip2 = gl
		st.dir = Vector3.UP
		st.want = 2.1
		R.reach.R = gr
		R.hand.R = "fist"
		_st_place(1.0)
		s.main.sfx("become", null, -8.0)
		s.burst(R.position + Vector3(0, 1.2, 0), Color("fff6d8"), Color("c8b4ff"), 34, 2.6, 0.0, 0.035, 0.8)
	else:
		if st.has("root") and is_instance_valid(st.root):
			if not quiet:
				s.smoke(R.position + Vector3(sin(R.yaw) * 0.3, 1.1, cos(R.yaw) * 0.3), 8, false)
				s.main.sfx("poof", null, -10.0)
			st.root.queue_free()
		st = {}
		if R:
			R.reach = { "L": null, "R": null }
			R.hand = { "L": "", "R": "" }
			if R.held.R:
				R.held.R.visible = true
				R.hand.R = "hold"


## Stood by him on its foot; or, if there's something to be lit, held out at it.
func _st_place(dt: float) -> void:
	var R: Node3D = s.hero
	var fw := Vector3(sin(R.yaw), 0, cos(R.yaw))
	var rt := Vector3(-fw.z, 0, fw.x)
	var dir := Vector3.UP
	var foot: Vector3 = R.position + fw * 0.26 + rt * 0.34
	var hold := 1.06
	if aim != null:
		var hand: Vector3 = R.position + fw * 0.34 + rt * 0.16 + Vector3(0, 1.05, 0)
		dir = ((aim as Vector3) - hand).normalized()
		foot = hand - dir * 0.8
		hold = 0.8
	var k := 1.0 - exp(-11.0 * dt)
	st.dir = (st.dir as Vector3).lerp(dir, k).normalized() if (st.dir as Vector3).dot(dir) > -0.9 else dir
	st.foot = (st.get("foot", foot) as Vector3).lerp(foot, 1.0 - exp(-22.0 * dt))
	st.hold = lerpf(st.get("hold", hold), hold, k)
	staff_len(st, lerpf(st.len, STAFF, k))
	var y: Vector3 = st.dir
	var x := y.cross(Vector3(0.013, 0.02, 1.0)).normalized()
	(st.root as Node3D).global_transform = Transform3D(Basis(x, y, x.cross(y)), st.foot)
	(st.grip as Node3D).position = Vector3(0, st.hold, 0)
	(st.grip2 as Node3D).position = Vector3(0, st.hold - 0.3, 0)
	R.reach.L = st.grip2 if aim != null else null


## The end of it.
func staff_tip() -> Vector3:
	return (st.root as Node3D).global_transform * Vector3(0, float(st.len), 0)


## Its light goes over to something, a mote at a time.
func stream(to: Vector3) -> void:
	for q in 2: s.burst(staff_tip().lerp(to, randf()), Color("ffe29a"), Color("c8b4ff"), 1, 0.1, 0.1, 0.028, 0.5)


func _mana_update(dt: float) -> void:
	if not mana_on: return
	var want: bool = force or (Input.is_physical_key_pressed(KEY_F) or Input.is_joy_button_pressed(0, JOY_BUTTON_RIGHT_SHOULDER)) and s.mode == "play" and not s.locked
	if faint > 0.0:
		faint -= dt
		want = false
		if faint <= 0.0 and s.hero:
			s.hero.gest = ""
			s.locked = false
			mana = 0.6
	if want and not awake and mana < 0.08: want = false
	_wake(want)
	mana = clampf(mana + (-drain if awake else back) * dt, 0.0, 1.0)
	if awake and mana <= 0.0:                            # all of him, and he's down
		_wake(false)
		faint = 2.4
		s.locked = true
		s.main.sfx("thump", null, -6.0)
		s.hero.do("fall", 3.4)
		s.hero.feel("squeeze", "wavy", 2.4)
		s.hero.say_bubble(["That's all of me.", "...Ow.", "It's heavy. It's so heavy.", "Too long."][randi() % 4], s.campus.font, 2.0)
	s.ui.mana(mana)
	if awake:
		staff_motes(st, dt)
		if aim == null:
			for l in lamps: if not l.lit and s.hero.position.distance_to(l.p) < l.get("r", 2.6): aim = l.p + Vector3(0, l.h + 0.08, 0)
		_st_place(dt)
		aim = null
	for l in lamps:
		if l.lit: continue
		var near_: bool = awake and s.hero.position.distance_to(l.p) < l.get("r", 2.6)
		l.t = maxf(0.0, l.t + (dt if near_ else -dt * 0.5))
		if near_: stream(l.p + Vector3(0, l.h, 0))
		if l.t > 0.5: _light(l)


func _light(l: Dictionary) -> void:
	l.lit = true
	l.f = flame(l.p + Vector3(0, l.h, 0), 1.3, true)
	s.main.sfx("ignite", null, -4.0)
	s.burst(l.p + Vector3(0, l.h, 0), Color("ffd24a"), Color("ff9a3a"), 16, 1.2, 0.6, 0.03, 0.8)


## A lamp to be lit: a candle on a stand.
func lamp(p: Vector3) -> Dictionary:
	a.keep(s.put("stand", p, 0.0, 0.9))
	a.keep(s.put("candle", p + Vector3(0, 0.93, 0)))
	var l := { "p": p, "h": 1.22, "lit": false, "t": 0.0 }
	lamps.append(l)
	return l


func lamps_left() -> int:
	var n := 0
	for l in lamps: if not l.lit: n += 1
	return n


## Play until they're all lit.
func lamps_play(text: String) -> void:
	var id: int = a.run_id
	s.play()
	s.hero.face_yaw = null
	var t0: float = s.time
	while a.run_id == id and lamps_left() > 0:
		s.ui.objective("%s  (%d left)" % [text, lamps_left()])
		if s.main.dev_auto and faint <= 0.0:              # (as a player would: up to one, awake, and away again)
			for l in lamps:
				if l.lit: continue
				s.hero.place(l.p + Vector3(0.9, 0, 0.9), s.hero.yaw)
				force = true
				var t1: float = s.time
				while not l.lit and s.time < t1 + 2.0 and a.run_id == id: await s.beat()
				force = false
				await s.wait(0.8)
				break
		await s.beat()
	force = false
	s.ui.objective("")


# ==================================================================== 7 == --
func e7_pity() -> void:
	open(10.2)
	s.campus.chapter = 3
	s.film()
	music("school")
	var l: Array = ["wim", "petra", "nadi", "otto", "isolde", "kas", "bet", "tobin", "maron", "selma", "cassian", "odile", "ilse", "joss", "thorne", "lucan"]
	take(l)
	clear(-33, -8, 13)
	var R := reiner(YARD.x, YARD.z, -PI / 2)
	R.hold("R", s.prop("wand_black"), GRIP)
	var W := at("wim", YARD.x + 0.4, YARD.z + 1.5, -PI / 2)
	W.hold("R", form("wim"), GRIP)
	for n in l: if n != "wim": act(n).visible = false
	s.move(Vector3(-27.6, 2.6, -3.0), YARD + Vector3(-1, 1.0, 0), Vector3(-30.4, 1.9, -5.0), YARD + Vector3(-0.4, 1.0, 0.4), 4.5, 46)
	await s.fade(0.0, 1.0)
	s.ui.place("The Mage Academy. The week after")
	await s.wait(1.6)
	W.look = R
	R.look = W
	s.two(R, W, 1.0, 2.3, 40, 0.05)
	await s.say("wim", "And it nodded.", { "eyes": "wide", "mouth": "small" })
	await s.say("reiner_uni", "Three times.", { "eyes": "soft", "mouth": "smile" })
	await s.say("wim", "And then it was a STAFF. Taller than you are. All lit up round the edges. And then it was a baton.", { "eyes": "wide", "mouth": "oh" })
	s.face(R, 0.2, 1.4, 36)
	await s.say("reiner_uni", "I've asked it every morning since. It just goes on being a baton. It's friendly about it.", { "eyes": "half", "mouth": "smile" })
	raise("wim")
	reveal("wim", 0.3, 1.6)
	s.main.sfx("chirp")
	await s.say("wim", "Mine thinks yours is wonderful. It's never purred at anybody. It purred through History.", { "eyes": "happy", "mouth": "smile" })
	lower("wim")
	# everybody wants to see
	var arc := [["petra", -0.9], ["nadi", -0.45], ["otto", 0.0], ["isolde", 0.45], ["kas", 0.9], ["bet", 1.35], ["tobin", 1.8], ["selma", -1.4]]
	for q in arc:
		var p := at(q[0], R.position.x + sin(q[1] + PI / 2) * 5.0, R.position.z + cos(q[1] + PI / 2) * 5.0, q[1] - PI / 2)
		p.go_free([Vector3(R.position.x + sin(q[1] + PI / 2) * 1.9, 0, R.position.z + cos(q[1] + PI / 2) * 1.9)], 2.6)
		p.look = R
	R.face_yaw = PI / 2
	W.place(YARD + Vector3(-0.6, 0, 1.2), PI / 2)
	s.cut(YARD + Vector3(-2.6, 1.9, 3.0), YARD + Vector3(0.9, 1.1, -0.2), 48)
	await s.wait(1.4)
	s.face(act("petra"), 0.2, 1.4, 40)
	await s.say("petra", "You've GOT one! You've got one! Let's see! It's got GOLD on it!", { "eyes": "happy", "mouth": "shout" })
	s.face(act("isolde"), 0.2, 1.4, 38)
	await s.say("isolde", "Eleven pages. I said so on the fourth.", { "eyes": "half", "mouth": "smile" })
	s.face(act("bet"), 0.2, 1.4, 38)
	await s.say("bet", "Something'd have you, I said. It was only slow.", { "eyes": "happy", "mouth": "grin" })
	var T := at("thorne", YARD.x - 4.4, YARD.z + 0.3, PI / 2)
	T.go_free([R.position + Vector3(-1.2, 0, 0.1)], 1.7)
	R.face_yaw = -PI / 2
	R.look = T
	s.cut(YARD + Vector3(1.3, 1.65, -0.9), YARD + Vector3(-1.6, 1.2, 0.2), 46)
	await s.until(func(): return T.path.is_empty(), 4.0)
	T.face_yaw = PI / 2
	T.look = R.position + Vector3(0, 0.95, 0)
	await s.wait(0.5)
	s.face(T, 0.6, 1.4, 38)
	await s.say("thorne", "Give it here a minute, my love.", { "eyes": "soft", "mouth": "smile" })
	s.main.sfx("chirp", null, -4.0)
	T.do("flinch", 0.7)
	s.burst(R.hand_pos("R"), Color("ffe08a"), Color("e0b84a"), 10, 1.2, -1.0, 0.025, 0.6)
	s.face(T, 0.75, 1.5, 38)
	await s.say("thorne", "...It'd sooner not. And it's no wand, my love. That's a baton. I've turned every stick in this school, or my mother did, or hers, and nobody ever turned that.", { "eyes": "wide", "mouth": "flat" })
	R.face_yaw = PI / 2
	R.look = null
	# the Wits
	music("wits")
	var C := at("cassian", -27.0, -6.6, -PI / 2)
	var O := at("odile", -26.2, -5.4, -PI / 2)
	at("ilse", -26.6, -7.8, -PI / 2).look = R
	at("joss", -25.8, -8.8, -PI / 2).look = R
	C.hold("R", form("cassian"), GRIP)
	O.hold("R", form("odile"), GRIP)
	C.look = R
	O.look = R
	s.cut(Vector3(-29.3, 1.6, -5.0), Vector3(-26.6, 1.25, -6.6), 44)
	await s.say("cassian", "Well, naturally. Four hundred wands say no. And then, overnight, on the lawn, a black stick. It isn't even a wand!", { "eyes": "half", "mouth": "smirk" })
	s.face(O, 0.2, 1.4, 38)
	await s.say("odile", "Somebody's had it fixed for him. It's kind, really. Think how it must have felt, watching.", { "eyes": "soft", "mouth": "smile" })
	s.face(act("joss"), 0.2, 1.4, 38)
	await s.say("joss", "That's not fair on those who got theirs properly, then.", { "eyes": "half", "mouth": "frown" })
	s.face(C, 0.2, 1.3, 36)
	await s.say("cassian", "A pity present! He can't light a candle, so they give him a board to hang it on. He can't get a wand, so somebody drops him one. Is that all he's going to get? Hand-outs?", { "eyes": "happy", "mouth": "grin" })
	s.face(R, 0.2, 1.2, 34)
	R.look = C
	R.feel("stern", "flat")
	R.hand.R = "fist"
	await s.wait(1.6)
	var k: int = await s.ask([["0", "Say nothing. Train."], ["1", "\"Then it was a kind thing to do.\""]])
	a.flag.pity = k
	if k == 1:
		await s.say("reiner_uni", "If somebody did that for me, then it was a kind thing to do. I'd better not waste it.", { "eyes": "soft", "mouth": "flat" })
		s.face(C, 0.2, 1.3, 36)
		C.feel("wide", "flat")
		await s.wait(1.0)
	else:
		s.main.sfx("chirp", null, -8.0)
		s.cut(R.hand_pos("R") + Vector3(0.6, 0.25, 0.4), R.hand_pos("R"), 32)
		await s.wait(1.6)
	music("school")
	s.face(W, 0.2, 1.3, 36)
	W.look = R
	await s.say("wim", "It chased you. All round the school and in at a window. I don't think anything's ever chased anybody out of pity.", { "eyes": "stern", "mouth": "flat" })
	a.gain("wim", 1)
	s.face(R, 0.2, 1.2, 34)
	R.look = W
	R.feel("sad", "smile")
	await s.wait(1.0)
	await s.say("reiner_uni", "...Right. Again, then. From the feet.", { "eyes": "soft", "mouth": "smile" })
	R.face_yaw = -PI / 2
	R.pose = "cast"
	s.move(YARD + Vector3(3.4, 1.8, 3.4), YARD + Vector3(-1.0, 1.1, 0), YARD + Vector3(5.6, 3.4, 5.6), YARD + Vector3(-1.5, 1.2, 0), 5.0, 44)
	var r: float = await s.cast([["Feet", "D"], ["breath", "U"], ["and", "L"], ["when", "R"], ["you're", "U"], ["ready", "D"]], { "gap": 0.8, "wide": 0.28, "name": "From the feet" })
	R.do("castdo", 1.0)
	await s.wait(1.0)
	var M := at("maron", -24.0, 2.6, -2.2)
	M.look = R
	s.face(M, 0.2, 1.4, 34)
	M.feel("soft", "flat")
	await s.wait(1.6)
	M.feel("down", "flat")
	await s.wait(0.8)
	await s.fade(1.0, 1.0)
	R.pose = "stand"
	disarm(["wim", "cassian", "odile"])
	drop(R, "R")
	a._free_people()


# ==================================================================== 8 == --
## The two of them, turned a little out from each other, so there's a face to see past all that hair.
func open_two(p: Node3D, q: Node3D, side: float, d: float, fov: float) -> void:
	var ab: Vector3 = (q.position - p.position).normalized()
	var n := Vector3(-ab.z, 0, ab.x) * side
	var m: Vector3 = (p.head_pos() + q.head_pos()) * 0.5
	p.look = null
	q.look = null
	p.face_yaw = atan2(ab.x + n.x * 0.9, ab.z + n.z * 0.9)
	q.face_yaw = atan2(-ab.x + n.x * 0.9, -ab.z + n.z * 0.9)
	s.cut(m + n * d, m - Vector3(0, 0.12, 0), fov)
	await s.wait(0.3)


## Round to face something, all of them (a head turns only so far).
func turned(n: String, to) -> void:
	var q: Node3D = act(n)
	var tp: Vector3 = to.global_position if to is Node3D else to
	q.look = to
	q.face_yaw = atan2(tp.x - q.position.x, tp.z - q.position.z)
	await s.wait(0.6)


func e8_costs() -> void:
	open(15.1)
	s.campus.chapter = 3
	s.film()
	music("bucket")
	take(FIRST + ["thorne", "corvin"])
	clear(-33, -8, 13)
	_yard_ring(4.1)
	armed(FIRST)
	var R := reiner(YARD.x + sin(-2.75) * 4.1, YARD.z + cos(-2.75) * 4.1, -2.75 + PI)
	R.hold("R", s.prop("wand_black"), GRIP)
	var T := at("thorne", YARD.x, YARD.z, PI)
	T.hold("R", form("thorne"), GRIP)
	s.move(Vector3(-28.0, 3.0, -1.4), YARD + Vector3(0, 0.8, 0), Vector3(-29.8, 2.2, -3.6), YARD + Vector3(0, 0.9, 0), 4.5, 48)
	await s.fade(0.0, 0.8)
	s.ui.place("The lesson that week")
	T.face_yaw = 0.6
	await s.say("thorne", "You're all very proud, carrying those about awake. Petra. How long's yours been lit?", { "eyes": "soft", "mouth": "smile" })
	raise("petra")
	reveal("petra")
	await s.say("petra", "Since breakfast! It doesn't get tired! I don't get... I don't...", { "eyes": "happy", "mouth": "grin" })
	var P: Node3D = act("petra")
	P.feel("half", "wavy")
	P.do("sigh", 1.4)
	await s.wait(1.2)
	lower("petra")
	s.main.sfx("fizz")
	drop(P, "R")
	P.hold("R", s.prop("wand_cherry"), GRIP)
	s.smoke(P.hand_pos("R"), 8, false)
	P.do("fall", 5.0)
	s.main.sfx("thump", null, -8.0)
	s.cut(P.position + (YARD - P.position).normalized() * 3.2 + Vector3(0, 1.5, 0), P.position + Vector3(0, 0.85, 0), 46)
	await s.wait(1.3)
	var ph: Vector3 = P.head_pos()
	s.cut(ph + (YARD - P.position).normalized() * 0.9 + Vector3(0.2, 0.95, 0.1), ph, 40)
	await s.say("petra", "...Oh.", { "eyes": "squeeze", "mouth": "wavy" })
	s.face(act("selma"), 0.2, 1.4, 38)
	act("selma").feel("shut", "smile")
	await s.say("selma", "Told you.", { "eyes": "shut", "mouth": "smile" })
	s.face(T, 0.2, 1.6, 36)
	await s.say("thorne", "That's what it costs. A wand awake is your whole heart, out in the weather. It drinks mana like a calf drinks milk. Leave it out, and down you go.", { "eyes": "open", "mouth": "flat" })
	await s.say("thorne", "So. Two weeks. You'll learn to wake it when you need it, and put it away when you don't. Waking's easy. It's the putting away.", { "eyes": "soft", "mouth": "smile" })
	for n in ["isolde", "otto", "kas", "wim", "nadi", "selma", "bet", "tobin"]:      # they go out, one after another
		s.main.sfx("poof", null, -14.0)
		s.smoke(act(n).hand_pos("R"), 5, false)
		drop(act(n), "R")
		act(n).hold("R", s.prop(KINDS[FIRST.find(n) % KINDS.size()]), GRIP)
		if n == "wim": s.cut(Vector3(-29.8, 2.2, -3.6), YARD + Vector3(0, 0.9, 0), 46)
		await s.wait(0.2)
	T.look = R
	T.face_yaw = -2.75
	s.face(R, 0.2, 1.4, 36)
	await s.say("thorne", "And you, Reiner. Yours won't come out at all, so they tell me.", { "as": "Mistress Thorne" })
	await s.say("reiner_uni", "It did once. I think I frightened it.", { "eyes": "sad", "mouth": "smile" })
	s.face(T, 0.2, 1.5, 36)
	await s.say("thorne", "Or it's mannerly. It took one look at how much there was in you, and went back in before it drank you dry. Ask it for a breath. Just the one.", { "eyes": "soft", "mouth": "smile" })
	R.place(YARD + Vector3(0.0, 0, -1.4), 0.0)
	T.place(YARD + Vector3(1.9, 0, -2.4), -0.7)
	s.hero = R
	s.cut(YARD + Vector3(-2.0, 1.4, 1.2), YARD + Vector3(0, 1.1, -1.4), 42)
	R.pose = "cast"
	await s.cast([["Only", "U"], ["a", "L"], ["breath", "R"], ["and", "L"], ["then", "R"], ["you", "U"], ["can", "D"], ["rest", "D"]], { "gap": 0.78, "wide": 0.28, "name": "One breath" })
	R.pose = "stand"
	mana_start(0.28, 0.2)
	s.cut(YARD + Vector3(-1.7, 1.3, 0.6), YARD + Vector3(0, 1.15, -1.4), 44)
	force = true
	await s.wait(0.6)
	music("staff")
	for n in FIRST: act(n).feel("wide", "oh")
	s.move(YARD + Vector3(1.9, 0.8, 1.6), YARD + Vector3(0, 1.1, -1.3), YARD + Vector3(-1.5, 1.3, 1.5), YARD + Vector3(0, 1.15, -1.3), 2.6, 48)
	await s.wait(2.6)
	force = false
	await s.wait(0.2)
	s.main.sound.music("")
	R.feel("wide", "oh")
	s.face(act("wim"), 0.2, 1.4, 38)
	await s.say("wim", "That's... THAT'S it? All that was in there the whole TIME?", { "eyes": "wide", "mouth": "oh" })
	s.face(act("isolde"), 0.2, 1.4, 38)
	await s.say("isolde", "...Twelve pages.", { "eyes": "wide", "mouth": "small" })
	s.face(R, 0.2, 1.4, 36)
	await s.say("reiner_uni", "It went back. I asked it to, and it went.", { "eyes": "wide", "mouth": "smile" })
	s.face(T, 0.2, 1.5, 36)
	await s.say("thorne", "There. That's the hard half, and you've done it first go. Now do it for me five times running.", { "eyes": "happy", "mouth": "grin" })
	music("bucket")
	for i in 5: lamp(YARD + Vector3([-3.0, 2.8, -2.2, 2.4, 0.2][i], 0, [-2.2, 0.6, 2.4, 3.2, -3.8][i]))
	for n in FIRST: act(n).place(act(n).position + (act(n).position - YARD).normalized() * 2.2, act(n).yaw)
	T.place(YARD + Vector3(5.2, 0, -4.0), -0.9)
	mana = 1.0
	drain = 0.46
	s.ui.toast("Hold F to wake the staff: by a candle, its light catches the wick. Let go to put it away. Run out of mana and you go down.")
	await lamps_play("Light the candles: wake it close by, and put it away between")
	s.film()
	s.main.sfx("chime")
	R.place(YARD, 0.4)
	T.place(YARD + Vector3(0.5, 0, 1.5), PI + 0.3)
	s.two(R, T, 1.0, 2.6, 40, 0.1)
	T.look = R
	R.look = T
	await s.say("thorne", "That's it. That's all it is. The rest's only practice.", { "eyes": "soft", "mouth": "smile" })
	mana_stop()
	await s.fade(1.0, 0.9)
	disarm(FIRST + ["thorne"])
	drop(R, "R")
	a._free_people()


# ==================================================================== 9 == --
func e9_weeks() -> void:
	open(16.6)
	s.campus.chapter = 3
	s.film()
	music("train")
	take(["wim"])
	clear(-33, -8, 16)
	var R := reiner(YARD.x, YARD.z + 1.2, PI)
	R.hold("R", s.prop("wand_black"), GRIP)
	var W := at("wim", YARD.x - 1.4, YARD.z + 1.8, PI)
	W.hold("R", s.prop("wand_ash"), GRIP)
	s.hero = R
	s.move(Vector3(-29.0, 2.2, -3.4), YARD + Vector3(0, 1, 0), Vector3(-30.2, 1.8, -4.8), YARD + Vector3(0, 1, 0), 3.6, 46)
	await s.fade(0.0, 0.8)
	s.ui.place("The fourth day")
	s.two(R, W, 1.0, 2.4, 40, 0.1)
	R.look = W
	W.look = R
	await s.say("wim", "Mine will come out if I don't look at it. Yours will come out if you don't hold on to it. We're both going to have to learn not to do something.", { "eyes": "worry", "mouth": "smile" })
	await s.say("reiner_uni", "Birds, then. One at a time.", { "eyes": "soft", "mouth": "smile" })
	R.look = null
	mana_start(0.42, 0.24)
	W.place(YARD + Vector3(-5.2, 0, 2.6), PI / 2)
	W.look = R
	s.ui.toast("Hold F as a paper bird goes by, and the staff's light catches it. Put it away before the next.")
	await _birds(8, 0.0)
	s.film()
	_wake(false, true)
	R.place(YARD + Vector3(0.4, 0, 0.6), -PI / 2)
	W.place(YARD + Vector3(-1.1, 0, 0.6), PI / 2)
	R.look = W
	W.look = R
	s.two(R, W, 1.0, 2.2, 42, 0.1)
	R.feel("happy", "grin")
	W.feel("happy", "grin")
	W.do("cheer", 1.4)
	await s.wait(1.6)
	await s.fade(1.0, 0.6)
	# what's said
	mana_on = false
	s.ui.mana(-1.0)
	open(18.6)
	s.campus.chapter = 3
	take(["wim", "cassian", "odile", "ilse", "joss", "bet", "isolde", "kas", "tobin", "lucan", "dorn", "sibyl"])
	music("low")
	R = reiner(3.2, -7.7, -PI / 2, FY[0])
	R.hold("R", s.prop("wand_black"), GRIP)
	var C := at("cassian", -2.9, -8.6, PI * 0.36, FY[0])
	var O := at("odile", -2.5, -7.45, PI * 0.72, FY[0])
	at("joss", -3.7, -7.8, PI * 0.5, FY[0])
	for n in ["wim", "ilse", "bet", "isolde", "kas", "tobin", "lucan", "dorn", "sibyl"]: act(n).visible = false
	C.look = O
	O.look = C
	s.cut(Vector3(-0.5, 1.5, -8.35), Vector3(-3.0, 1.32, -8.0), 46)
	await s.fade(0.0, 0.6)
	s.ui.place("The ninth day")
	await s.say("odile", "Two seconds, they say. He can keep it up for two whole seconds.", { "eyes": "soft", "mouth": "smile" })
	await s.say("cassian", "I've had mine out since Tuesday. I haven't put it away once. One doesn't put away what one's entitled to.", { "eyes": "half", "mouth": "smirk" })
	s.face(act("joss"), 0.2, 1.4, 38)
	await s.say("joss", "Somebody should tell him. It'd be kinder than letting him think he belongs.", { "eyes": "half", "mouth": "flat" })
	s.face(R, 0.2, 1.3, 36)
	R.feel("sad", "flat")
	await s.wait(1.4)
	R.face_yaw = PI / 2
	await s.wait(0.8)
	# whoever's closest finds him after
	var l: Array = a.closest()
	var who: String = "wim"
	for w in l: if w in ["wim", "bet", "isolde", "kas", "tobin", "lucan", "dorn", "sibyl"]:
		who = w
		break
	C.visible = false
	O.visible = false
	act("joss").visible = false
	var V := at(who, 4.8, -7.5, -PI / 2, FY[0])
	V.look = R
	R.look = V
	s.two(R, V, 1.0, 2.2, 42, 0.1)
	var said: Dictionary = { "wim": "I heard them too. I've been frightened all my life of people saying things, and do you know, they're only saying things.", "bet": "Two seconds is all right. You know how long I hold a ladle? Till it's poured. Then I put it DOWN.", "isolde": "Two point four. I timed it. It was one point nine on Monday. I have a graph.", "kas": "Flowers shut at night. Nobody tells them they don't belong.", "tobin": "I still hear everything. Mostly what I hear is that they're scared of you. They just say it in a funny voice.", "lucan": "I held mine up for two years without once setting it down. Ask me what it was like. Then go and set yours down.", "dorn": "You don't hold it. You let it sit. You said.", "sibyl": "Entry sixty-two. Reiner. Went back to the yard. Unasked." }
	await s.say(who, said[who], { "eyes": "soft", "mouth": "smile" })
	s.face(R, 0.2, 1.2, 34)
	R.feel("soft", "smile")
	await s.say("reiner_uni", "...I was going back out anyway.", { "eyes": "soft", "mouth": "smile" })
	a.gain(who, 1)
	await s.fade(1.0, 0.7)
	# night, the yard, alone; then not
	open(20.6)
	s.campus.chapter = 3
	take(["wim"])
	clear(-33, -8, 13)
	s.main.sound.air("night")
	music("train")
	R = reiner(YARD.x, YARD.z + 1.0, PI)
	R.hold("R", s.prop("wand_black"), GRIP)
	s.hero = R
	W = at("wim", YARD.x + 4.6, YARD.z + 4.4, -2.3)
	W.hold("R", s.prop("wand_ash"), GRIP)
	s.cut(YARD + Vector3(4.2, 2.0, 5.0), YARD + Vector3(0, 1.1, 0.6), 46)
	await s.fade(0.0, 0.7)
	W.go_free([YARD + Vector3(1.5, 0, 1.6)], 1.3)
	await s.until(func(): return W.path.is_empty(), 5.0)
	W.look = R
	R.look = W
	s.two(R, W, -1.0, 2.2, 40, 0.1)
	await s.say("wim", "I couldn't sleep. It's my wand. It wanted to see yours.", { "eyes": "soft", "mouth": "wavy" })
	await s.say("reiner_uni", "Is it your wand, or you?", { "eyes": "soft", "mouth": "smile" })
	await s.say("wim", "It's got the ears for it. I've just got the pyjamas.", { "eyes": "happy", "mouth": "grin" })
	R.look = null
	mana_start(0.34, 0.26)
	W.place(YARD + Vector3(5.0, 0, 2.4), -PI / 2)
	W.look = R
	await _birds(12, 0.5)
	s.film()
	_wake(false, true)
	R.place(YARD + Vector3(0, 0, 0.8), PI / 2)
	W.place(YARD + Vector3(1.5, 0, 0.8), -PI / 2)
	W.look = R
	R.look = W
	R.feel("happy", "grin")
	s.two(R, W, -1.0, 2.2, 40, 0.1)
	await s.wait(0.5)
	await s.say("wim", "Four seconds. That was four seconds, and you put it away nine times, and you never fell down once!", { "eyes": "wide", "mouth": "grin" })
	a.gain("wim", 1)
	mana_stop()
	await s.fade(1.0, 0.9)
	disarm(["wim"])
	drop(R, "R")
	a._free_people()


## Paper birds come over, one and then another: they light up if the wand's awake as they go by.
func _birds(n: int, hard: float) -> void:
	var id: int = a.run_id
	s.play()
	s.hero.face_yaw = null
	var got := 0
	var k := 0
	var R: Node3D = s.hero
	while a.run_id == id and got < n:
		k += 1
		var b := Node3D.new()
		s.add_child(b)
		a.keep(b)
		b.add_child(s.prop("bird_body"))
		var wl: Node3D = s.prop("bird_wing")
		b.add_child(wl)
		var wr: Node3D = s.prop("bird_wing")
		wr.scale.x = -1.0
		b.add_child(wr)
		b.scale = Vector3.ONE * 1.5
		var an := randf() * TAU
		var c := YARD + Vector3(randf_range(-2.0, 2.0), 0, randf_range(-1.6, 2.2))
		var d := Vector3(sin(an), 0, cos(an))
		var t0: float = s.time
		var secs: float = lerpf(4.2, 3.2, hard)
		var hit := false
		s.campus.talk_lock = 6.0
		s.ui.objective("Light the birds as they go by  (%d left)" % (n - got))
		s.main.sfx("flutter", null, -10.0)
		while a.run_id == id and s.time < t0 + secs and not hit:
			var u: float = (s.time - t0) / secs
			b.position = c + d * lerpf(-9.0, 9.0, u) + Vector3(0, 1.7 + sin(s.time * 4.0) * 0.12, 0)
			b.rotation.y = atan2(d.x, d.z)
			wl.rotation.z = sin(s.time * 16.0) * 0.7
			wr.rotation.z = -sin(s.time * 16.0) * 0.7
			if s.main.dev_auto:
				if u > 0.4 and not b.has_meta("by"):
					b.set_meta("by", true)
					R.place(Vector3(c.x, 0, c.z) + d * 0.6, R.yaw)
				force = u > 0.42 and u < 0.72 and faint <= 0.0
			if awake and Vector2(b.position.x - R.position.x, b.position.z - R.position.z).length() < 3.0:
				aim = b.position
				stream(b.position)
			if awake and float(st.len) > 1.7 and staff_tip().distance_to(b.position) < 1.5:
				hit = true
				got += 1
				s.main.sfx("chime", null, -4.0)
				s.burst(b.position, Color("ffe9a8"), Color("c8b4ff"), 26, 2.0, 0.4, 0.03, 1.0)
			await s.beat()
		force = false
		b.queue_free()
		await s.wait(lerpf(0.9, 0.35, hard))
	s.campus.talk_lock = 0.0
	s.ui.objective("")


# =================================================================== 10 == --
func e10_dark() -> void:
	open(21.2)
	s.campus.chapter = 3
	s.film()
	music("sneak")
	s.main.sound.air("room")
	var l: Array = FIRST + ["cassian", "odile", "halden", "thorne"]
	take(l)
	_empty()
	for n in ["wim", "halden", "thorne", "cassian"]: act(n).visible = true
	var R := reiner(-18.2, -7.6, PI / 2, FY[0])
	R.hold("R", s.prop("wand_black"), GRIP)
	s.hero = R
	var W := at("wim", -17.2, -8.4, PI / 2, FY[0])
	W.hold("R", s.prop("wand_ash"), GRIP)
	var Hd := at("halden", -14.8, -7.3, -PI / 2, FY[0])
	var T := at("thorne", -14.9, -8.5, -PI / 2, FY[0])
	var C := at("cassian", -18.8, -8.6, PI / 2, FY[0])
	C.hold("R", form("cassian"), GRIP)
	raise("cassian")
	s.indoor_auto = true
	s.move(Vector3(-13.9, 1.9, -6.7), Vector3(-17.6, 1.2, -8.0), Vector3(-14.3, 1.8, -6.7), Vector3(-17.8, 1.2, -8.0), 3.0, 48)
	await s.fade(0.0, 0.9)
	s.ui.place("The fourteenth night. The Long Dark")
	await s.wait(1.8)
	s.cut(Vector3(-16.5, 1.6, -6.75), Vector3(-14.7, 1.4, -7.95), 46)
	await s.say("halden", "The length of the school, with every lamp out. Ten candles to light on the way. In pairs. I don't care how quickly.", { "eyes": "half", "mouth": "flat" })
	Hd.do("snap", 0.8)
	s.main.sfx("fizz", null, -4.0)
	s.cut(Vector3(-18.9, 2.1, -7.9), Vector3(-4.0, 1.2, -7.75), 52)
	var t9: float = s.time
	while s.time < t9 + 1.3:
		s.lamps_out = smoothstep(0.0, 1.2, s.time - t9)
		await s.beat()
	s.lamps_out = 1.0
	for x in [-17.0, -10.5, -3.6, 3.6, 10.5, 17.0]: moon(Vector3(x, FY[0] + 2.3, -6.9), 0.55, Color("9ab0f0"), 5.0)
	await s.wait(1.0)
	s.face(T, 0.2, 1.6, 36)
	await s.say("thorne", "You've only so much in you. It'll not last the corridor, awake. Nobody's would. So.", { "eyes": "soft", "mouth": "smile" })
	s.face(C, 0.2, 1.4, 38)
	await s.say("cassian", "Oh, I shan't need to put mine away.", { "eyes": "half", "mouth": "smirk" })
	s.face(R, 0.2, 1.3, 36)
	R.look = W
	await s.say("reiner_uni", "You do the ones on the left. I'll do the right. Whoever's empty, the other one waits.", { "eyes": "soft", "mouth": "flat" })
	s.face(W, 0.2, 1.3, 36)
	await s.say("wim", "It's very dark.", { "eyes": "worry", "mouth": "wavy" })
	s.face(R, 0.2, 1.2, 34)
	await s.say("reiner_uni", "Then it's lucky we're not.", { "eyes": "soft", "mouth": "smile" })
	lower("cassian")
	Hd.visible = false
	T.visible = false
	C.visible = false
	R.look = null
	for i in 10: lamp(Vector3(-15.5 + i * 3.5 + (1.4 if i == 2 else 0.0), FY[0], -6.75 if i % 2 else -8.75))
	for l2 in lamps: l2.r = 2.0
	mana_start(0.4, 0.2)
	var wim_t := 0.0
	var id: int = a.run_id
	line = [W]
	crumbs = []
	for i in 40: crumbs.append(R.position + Vector3(-i * 0.3, 0, 0))
	s.ui.toast("Wim lights the left-hand ones when you're beside them. Yours are on the right.")
	for i in 10: if i % 2 == 0: lamps[i].wim = true
	s.play()
	R.face_yaw = null
	while a.run_id == id and lamps_left() > 0:
		s.campus.talk_lock = 1.0
		s.ui.objective("The Long Dark:  light the candles  (%d left)" % lamps_left())
		for q in lamps:
			if q.lit or not q.get("wim", false): continue
			if R.position.distance_to(q.p) < 2.4:
				wim_t += s.dt_last
				if wim_t > 0.5:
					wim_t = 0.0
					s.main.sfx("chirp", null, -6.0)
					s.burst(W.hand_pos("R"), Color("ffe0a0"), Color("f2a0b8"), 14, 1.4, 0.0, 0.026, 0.7)
					_light(q)
		if s.main.dev_auto and faint <= 0.0:
			for q in lamps:
				if q.lit: continue
				R.place(q.p + Vector3(-0.3, 0, 1.0 if q.p.z < -8 else -1.0), PI / 2)
				if q.get("wim", false): break
				force = true
				var t1: float = s.time
				while not q.lit and s.time < t1 + 2.0 and a.run_id == id: await s.beat()
				force = false
				await s.wait(0.5)
				break
		await s.beat()
	if a.run_id != id: return
	s.ui.objective("")
	s.film()
	line = []
	_wake(false, true)
	s.ui.mana(-1.0)
	mana_on = false
	music("evening")
	R.place(Vector3(17.2, FY[0], -7.4), -PI / 2)
	W.place(Vector3(17.2, FY[0], -8.5), -PI / 2)
	W.path = []
	Hd.visible = true
	T.visible = true
	Hd.place(Vector3(15.4, FY[0], -7.4), PI / 2)
	T.place(Vector3(15.4, FY[0], -8.6), PI / 2)
	R.look = Hd
	W.look = Hd
	s.cut(Vector3(17.1, 1.6, -6.75), Vector3(15.2, 1.4, -7.95), 44)
	await s.wait(0.8)
	await s.say("halden", "Wim, five. Reiner, five. Neither on the floor.", { "eyes": "half", "mouth": "flat" })
	# and some way back down the corridor
	s.main.sfx("thump")
	await s.wait(0.8)
	C.visible = true
	C.place(Vector3(3.0, FY[0], -7.8), PI / 2)
	C.pose = "ground"
	C.feel("squeeze", "wavy")
	drop(C, "R")
	s.cut(Vector3(5.0, 0.9, -7.1), Vector3(3.0, 0.75, -7.8), 42)
	await s.say("cassian", "...I'm perfectly all right. I'm admiring the floor.", { "eyes": "squeeze", "mouth": "wavy" })
	s.face(Hd, 0.2, 1.5, 36)
	Hd.look = R
	await s.say("halden", "He kept his out the whole way, and he's halfway. You put yours away nine times. I counted.", { "eyes": "half", "mouth": "flat" })
	await s.say("halden", "I've taught forty years of people to hold on. I have seldom had one who knew when to let go and be trusted to have it come back.", { "eyes": "soft", "mouth": "smile" })
	s.face(R, 0.2, 1.2, 34)
	R.feel("wide", "smile")
	await s.say("reiner_uni", "It isn't me. It just likes to be asked.", { "eyes": "soft", "mouth": "smile" })
	s.main.sfx("chirp")
	# somebody else is listening
	await s.fade(1.0, 0.5)
	s.cut(Vector3(17.6, 1.5, -10.6), Vector3(15.6, 1.35, -8.0), 40)
	var M := at("maron", 19.2, -7.0, -PI / 2, FY[0])
	M.look = R
	moon(Vector3(18.4, 2.2, -6.8), 0.5, Color("ffd8a8"))
	s.face(M, 0.2, 1.3, 36)
	await s.fade(0.0, 0.5)
	M.feel("soft", "smile")
	await s.wait(1.4)
	await s.fade(1.0, 1.0)
	s.lamps_out = 0.0
	disarm(["wim", "cassian"])
	drop(R, "R")
	a._free_people()


# =================================================================== 11 == --
func e11_note() -> void:
	open(23.1)
	s.campus.chapter = 3
	s.film()
	music("low")
	s.main.sound.air("night")
	_empty()
	var bd: Dictionary = s.stage.data.rooms.hare.beds[0]
	var b2: Dictionary = s.stage.data.rooms.hare.beds[1]
	var cx: float = (bd.x + b2.x) * 0.5
	s.stage.shut("hare_r0")
	var M := at("maron", cx, bd.z + 1.9, PI, bd.y)
	M.stage = s.stage
	M.pose = "stand"
	s.hero = M
	moon(Vector3(cx + 0.5, bd.y + 2.0, bd.z + 0.8), 0.45, Color("ffd8a8"), 5.0)
	moon(Vector3(cx + 0.15, bd.y + 1.35, bd.z - 0.75), 0.55, Color("ffd8a8"), 3.5)
	var cardp := Vector3(bd.x, bd.y + 0.62, bd.z - 0.75)
	var bc: Node3D = a.keep(s.put("blackcard", cardp, 0.3, 1.0))
	bc.rotation = Vector3(-PI / 2, 0.4, 0)
	s.cut(Vector3(cx - 0.9, bd.y + 1.6, bd.z - 0.9), Vector3(cx + 0.1, bd.y + 1.15, bd.z + 1.6), 54)
	await s.wait(0.7)
	await s.fade(0.0, 1.0)
	s.ui.place("Hare House")
	M.do("stretch", 1.8)
	await s.wait(1.8)
	M.go_free([Vector3(cx, bd.y, bd.z + 0.4)], 1.0)
	await s.until(func(): return M.path.is_empty(), 4.0)
	M.look = bc
	M.feel("wide", "flat")
	s.main.sound.music("")
	s.cut(Vector3(cx + 0.6, bd.y + 1.35, bd.z - 0.35), cardp, 36)
	s.main.sfx("card", null, -6.0)
	await s.wait(1.6)
	s.face(M, 0.2, 1.2, 36)
	await s.wait(1.0)
	M.reach.R = cardp + Vector3(0, 0.1, 0)
	await s.wait(0.7)
	M.reach.R = null
	bc.visible = false
	var cd: Node3D = s.prop("blackcard")
	M.hold("R", cd, Transform3D(Basis(Vector3.RIGHT, -0.5).scaled(Vector3.ONE * 0.62), Vector3(0.0, -0.04, 0.06)))
	M.do("offer", 6.0)
	music("low")
	await s.wait(0.6)
	s.cut(M.hand_pos("R") + Vector3(0.3, 0.3, -0.85), M.hand_pos("R") + Vector3(0, 0.12, 0.1), 40)
	await s.wait(0.8)
	await s.tell("On the back, in white: \"You dropped something.\"")
	s.face(M, 0.2, 1.15, 34)
	M.feel("stern", "flat")
	await s.say("maron", "In here. Through a locked door, and Agnes, and me.", { "eyes": "stern", "mouth": "flat" })
	await s.say("maron", "First the garden. Now my pillow.", { "eyes": "worry", "mouth": "small" })
	# not as her
	M.look = null
	M.go_free([Vector3(cx + 0.1, bd.y, bd.z - 0.1)], 0.9)
	await s.wait(1.0)
	M.face_yaw = PI * 0.66
	await s.until(func(): return M.path.is_empty(), 2.0)
	await s.wait(0.6)
	s.face(M, 0.5, 1.3, 40)
	await s.say("maron", "I could go and look. Hat, umbrella, over the roofs. ...That's what they want. That's who they're waiting for.", { "eyes": "half", "mouth": "flat" })
	await s.say("maron", "So she's staying in tonight.", { "eyes": "stern", "mouth": "smile" })
	M.do("snap", 0.9)
	await s.wait(0.5)
	s.main.sfx("ting")
	await s.wait(1.6)
	# and there's somebody on the sill
	music("cat")
	var sill := Vector3(cx + 0.02, bd.y + 0.744, bd.z - 1.15)
	_cat_make(sill, 0.0)
	cat.pose = "sit"
	s.main.sfx("bellcat")
	M.drop("R")
	M.place(Vector3(cx - 0.1, bd.y, bd.z + 0.05), PI)
	s.cut(Vector3(cx + 0.5, bd.y + 1.3, bd.z - 0.15), sill + Vector3(0, 0.24, 0), 40)
	await s.wait(1.4)
	M.look = sill + Vector3(0, 0.25, 0)
	await cat_say("It's eleven o'clock. I was on my second sleep.", "The black cat")
	s.face(M, 0.3, 1.2, 38)
	await s.say("maron", "Somebody's been in my room, Cat.", { "eyes": "stern", "mouth": "flat" })
	_cat_shot(0.4, 0.75)
	await cat_say("Somebody's been in the garden, too. I sit by that door for a living. Nobody came through it. I want that understood.")
	s.face(M, 0.3, 1.2, 38)
	await s.say("maron", "I know. That's why I'm asking you. You can go where I can't be seen to.", { "eyes": "soft", "mouth": "flat" })
	_cat_shot(-0.3, 0.75)
	cat.look_t = 1.2
	await cat_say("And what do I get?")
	s.face(M, 0.3, 1.2, 36)
	await s.say("maron", "A herring.", { "eyes": "half", "mouth": "smirk" })
	_cat_shot(0.3, 0.7)
	await cat_say("Two. And one of these days you'll ask me what my name is.")
	s.face(M, 0.3, 1.2, 36)
	M.feel("wide", "small")
	await s.wait(1.0)
	await s.say("maron", "...Have you got one?", { "eyes": "wide", "mouth": "small" })
	_cat_shot(0.0, 0.7)
	cat.pose = "stand"
	await cat_say("Two herrings.")
	s.main.sfx("bellcat")
	await s.fade(1.0, 0.8)
	M.visible = false
	a._free_people()


## Everyone's in bed.
func _empty() -> void:
	for p in s.campus.people:
		p.busy = true
		p.a.visible = false


# ---------------------------------------------------------------------- cat --
func _cat_make(p: Vector3, yaw: float) -> void:
	cat = a._beast("cat", p, yaw)
	cat.yaw = yaw
	cat.pose = "stand"
	cat.talk = 0.0
	cat.look_t = 0.0
	cat.look = null
	cat.air = 0.0
	cat.step = 0.0
	var lt := OmniLight3D.new()                      # (so she can be told from the night)
	lt.light_color = Color("c8d4ff")
	lt.light_energy = 0.55
	lt.omni_range = 2.0
	lt.position = Vector3(0, 0.75, 0.75)
	cat.n.add_child(lt)


func cat_say(text: String, as_ := "The cat") -> void:
	cat.talk = 0.3 + text.length() * 0.03
	s.main.sfx("meow", null, -14.0)
	await s.say("cat", text, { "as": as_ })
	cat.talk = 0.0


func _cat_shot(side: float, d: float) -> void:
	var n: Node3D = cat.n
	var h: Vector3 = n.global_position + Vector3(0, 0.38 if cat.pose == "sit" else 0.3, 0)
	var y: float = cat.yaw + side
	s.cut(h + Vector3(sin(y) * d * 1.2, 0.08, cos(y) * d * 1.2), h - Vector3(0, 0.06, 0), 38)


func _cat_update(dt: float) -> void:
	if cat.is_empty() or not is_instance_valid(cat.n): return
	var n: Node3D = cat.n
	var P: Dictionary = cat.P
	cat.t += dt
	if cat.has("ghost"):
		var g: Node3D = cat.ghost
		n.position = g.position
		cat.yaw = lerp_angle(cat.yaw, g.yaw, 1.0 - exp(-12.0 * dt))
		cat.sp = g.speed
		cat.air = g.air
		if s.mode == "play" and g.speed > 0.4 and cat.pose != "stand": cat.pose = "stand"
	n.rotation.y = cat.yaw
	var v: float = cat.sp
	cat.ph += dt * v * (6.2 if v < 2.6 else 4.4)
	var k: float = clampf(v / 1.2, 0.0, 1.0)
	var run: float = smoothstep(2.4, 3.6, v)
	var off := { "FL": 0.0, "BR": 0.4, "FR": PI, "BL": PI + 0.4 }
	var gal := { "FL": 0.0, "FR": 0.5, "BL": 2.6, "BR": 3.1 }
	var sit: float = cat.get("sitk", 0.0)
	sit = move_toward(sit, 1.0 if cat.pose == "sit" else 0.0, dt * 4.0)
	cat.sitk = sit
	var crouch: float = move_toward(cat.get("crk", 0.0), 1.0 if cat.pose == "crouch" else 0.0, dt * 5.0)
	cat.crk = crouch
	for l in off:
		var ph: float = cat.ph + lerpf(off[l], gal[l], run)
		var an := sin(ph) * lerpf(0.55, 0.95, run) * k
		var fold := maxf(0.0, cos(ph)) * lerpf(0.7, 1.1, run) * k
		var up: Node3D = P["up" + l]
		var lo: Node3D = P["lo" + l]
		var hind: bool = l[0] == "B"
		up.rotation.x = -an + (0.95 if hind else -0.12) * sit + (0.5 if hind else -0.3) * crouch
		lo.rotation.x = fold + (-1.2 if hind else 0.1) * sit + (-0.7 if hind else 0.5) * crouch
	var body: Node3D = P.body
	var by: float = cat.get("by", body.position.y)
	cat.by = by
	body.position.y = by + absf(sin(cat.ph)) * 0.016 * k - 0.045 * crouch - 0.02 * sit + maxf(0.0, cat.air) * 0.0
	body.rotation.x = -0.55 * sit + sin(cat.ph) * 0.12 * run - clampf(cat.air * 0.8, -0.4, 0.4) + sin(cat.t * 1.6) * 0.012
	var hd: Node3D = P.head
	var hy := 0.0
	if cat.look != null:
		var lp: Vector3 = cat.look.global_position if cat.look is Node3D else cat.look
		hy = clampf(wrapf(atan2(lp.x - n.global_position.x, lp.z - n.global_position.z) - cat.yaw, -PI, PI), -1.1, 1.1)
	hd.rotation.y = lerpf(hd.rotation.y, hy, 1.0 - exp(-6.0 * dt))
	hd.rotation.x = 0.5 * sit - sin(cat.t * 0.9) * 0.05 + 0.2 * crouch
	(P.jaw as Node3D).rotation.x = absf(sin(cat.t * 17.0)) * 0.4 if cat.talk > 0.0 and s.ui.line_on else 0.0
	cat.talk = maxf(0.0, cat.talk - dt)
	var w := sin(cat.t * 1.7)
	(P.tail1 as Node3D).rotation = Vector3(0.5 - 0.9 * k + 0.7 * sit - run * 0.3, w * 0.25, 0)
	(P.tail2 as Node3D).rotation = Vector3(0.3 + sin(cat.t * 2.1) * 0.1, sin(cat.t * 1.7 - 0.7) * 0.35 + sit * 0.9, 0)
	(P.tail3 as Node3D).rotation = Vector3(0.2, sin(cat.t * 1.7 - 1.4) * 0.5 + sit * 0.9, 0)
	if cat.has("ghost") and s.mode == "play":
		cat.step += dt * v
		if cat.step > 1.5:
			cat.step = 0.0
			s.main.sfx("bellcat", null, -22.0)


## The cat is walked about by somebody nobody can see.
func _ghost(g: Node3D, on: bool) -> void:
	(g.body as Node3D).visible = not on


# =================================================================== 12 == --
const WX := 14.5                         # where it stops: a blank bit of wall, in the top corridor


func e12_cat() -> void:
	open(23.4)
	s.campus.chapter = 3
	s.film()
	music("cat")
	s.main.sound.air("night")
	take(["vane"])
	_empty()
	var g: Node3D = s.enter("hettie", Vector3(26.4, 0, 20.4), -PI / 2)
	_ghost(g, true)
	s.hero = g
	_cat_make(g.position, -PI / 2)
	cat.ghost = g
	s.eye_h = 0.42
	s.cam_dist = 2.2
	for d in ["main", "library"]:                          # (left ajar, at night, for whoever catches the mice)
		s.stage.doors[d].want = true
		s.stage.doors[d].by_hand = true
	s.cut(Vector3(23.6, 0.7, 22.4), Vector3(26.4, 0.3, 20.4), 44)
	await s.fade(0.0, 0.9)
	await cat_say("Very well. Nobody came in by the door. Nobody came in by the window. I'd have sat in it.")
	_cat_shot(0.3, 0.8)
	await cat_say("So we begin with the smell.")
	s.play()
	g.face_yaw = null
	s.ui.toast("You're the cat. Hold F to follow the scent. E to look closer.")
	var id: int = a.run_id
	# black chalk
	await _clue(Vector3(22.6, 0, 18.4), "Follow the scent from under her window", func() -> void:
		var p := Vector3(22.6, 0.02, 18.4)
		a.keep(s.put("chalk_black", p, 0.4, 1.0))
		s.cut(p + Vector3(-0.85, 0.42, -0.35), p + Vector3(0.16, 0.2, 0.2), 42)
		s.burst(p + Vector3(0, 0.05, 0), Color("14111a"), Color("3a3448"), 24, 0.8, -1.0, 0.02, 1.2)
		await cat_say("Chalk. Black chalk. Now who makes black chalk? What would you write on?"))
	if a.run_id != id: return
	# over the water
	await _clue(Vector3(0.6, 0, 17.0), "It goes across the court", func() -> void:
		s.cut(Vector3(2.4, 1.1, 17.4), Vector3(0, 0.5, 14.4), 44)
		for k in 5:
			s.burst(Vector3(0.3 - k * 0.1, 0.5, 15.2 - k * 0.6), Color("14111a"), Color("6a5a88"), 6, 0.3, 0.1, 0.03, 2.4)
			s.main.sfx("ting", null, -16.0)
			await s.wait(0.35)
		_cat_shot(0.5, 0.8)
		await cat_say("They didn't go round the water. They didn't jump it, either. They walked.")
		await cat_say("...I don't care for that."))
	if a.run_id != id: return
	# the candle
	await _clue(Vector3(3.6, FY[0], -18.2), "In at the great door, and up to the Founder's candle", func() -> void:
		a.ch1.lean = Vector2.ZERO
		s.cut(Vector3(2.4, 1.2, -16.6), Vector3(4.2, 1.2, -19.0), 42)
		await cat_say("Good evening. You see everyone who comes in. Which way did they go?")
		var t0: float = s.time
		while s.time < t0 + 1.6:
			a.ch1.lean = Vector2(-0.5, -0.5) * smoothstep(0.0, 1.0, s.time - t0)
			await s.beat()
		s.main.sfx("chime", null, -10.0)
		_cat_shot(0.4, 0.8)
		await cat_say("Up. It's always up."))
	if a.run_id != id: return
	a.ch1.lean = Vector2.ZERO
	await _vane_puss(g)
	if a.run_id != id: return
	# the register
	await _clue(Vector3(9.3, FY[1], -11.6), "Up the stairs, to the Library", func() -> void:
		a.keep(s.put("book_open", Vector3(8.7, FY[1] + 0.02, -12.0), 0.4, 1.9))
		s.cut(Vector3(7.8, FY[1] + 0.95, -11.3), Vector3(8.9, FY[1] + 0.15, -11.85), 42)
		await s.wait(0.6)
		await cat_say("The Register of Admissions. Open, on the floor. Open at the year she came.")
		s.main.sfx("paper")
		_cat_shot(0.4, 0.8)
		await cat_say("There's the page before her. There's the page after. And there, very neatly, with a ruler, is where she isn't."))
	if a.run_id != id: return
	# the wall
	await _clue(Vector3(WX, FY[2], -8.3), "One floor more. It ends in the top corridor", func() -> void: await s.wait(0.1))
	if a.run_id != id: return
	s.film()
	music("")
	s.main.sound.air("")
	var wz := -9.14
	g.place(Vector3(WX, FY[2], -7.7), PI)
	cat.yaw = PI
	var door: Node3D = a.keep(s.put("chalkdoor", Vector3(WX, FY[2], wz), 0.0, 1.0))
	moon(Vector3(WX + 1.0, FY[2] + 1.6, -7.2), 0.7, Color("b4c4ff"))
	s.cut(Vector3(WX + 0.7, FY[2] + 1.15, -6.45), Vector3(WX, FY[2] + 0.92, wz), 62)
	await s.wait(1.6)
	await cat_say("It stops. In the middle of a wall.")
	s.move(Vector3(WX + 0.4, FY[2] + 0.5, -7.1), Vector3(WX, FY[2] + 1.0, wz), Vector3(WX + 0.2, FY[2] + 0.6, -7.5), Vector3(WX, FY[2] + 1.1, wz), 3.0, 46)
	await cat_say("Somebody's drawn a door on it.")
	var cp := Vector3(WX, FY[2] + 0.34, wz + 0.04)
	var bc: Node3D = a.keep(s.put("blackcard", cp, 0.0, 0.9))
	s.main.sfx("card")
	s.cut(Vector3(WX + 0.3, FY[2] + 0.6, -8.3), cp + Vector3(0, 0.2, 0), 36)
	await s.wait(1.0)
	await s.tell("On the back, in white: \"Good puss.\"")
	_cat_shot(0.5, 0.75)
	cat.pose = "crouch"
	s.main.sfx("hiss")
	await s.wait(1.2)
	# it's humming; five notes
	for k in 5:
		s.main.sfx(["na", "nb", "nc", "nd", "ne"][k], null, -4.0)
		await s.wait([0.42, 0.42, 0.9, 0.5, 1.2][k])
	s.cut(Vector3(WX - 0.5, FY[2] + 1.15, -6.45), Vector3(WX, FY[2] + 0.92, wz), 60)
	var ln := OmniLight3D.new()
	ln.light_color = Color("ffe8c8")
	ln.light_energy = 0.0
	ln.omni_range = 3.0
	s.add_child(ln)
	a.keep(ln)
	ln.position = Vector3(WX, FY[2] + 0.1, wz + 0.2)
	s.main.sfx("door", null, -6.0)
	var t0: float = s.time
	while s.time < t0 + 1.6:
		ln.light_energy = 2.2 * smoothstep(0.0, 1.4, s.time - t0)
		await s.beat()
	await s.wait(0.8)
	# a hand comes out, and rubs it away
	var glv: Node3D = a.keep(s.put("glove", Vector3(WX + 0.4, FY[2] + 1.1, wz - 0.1), 0.0, 1.2))
	s.main.sfx("chalk")
	t0 = s.time
	while s.time < t0 + 2.0:
		var u: float = (s.time - t0) / 2.0
		glv.position = Vector3(WX + 0.4 - u * 0.8 + sin(u * 22.0) * 0.16, FY[2] + 1.4 - u * 1.1, wz + 0.1)
		glv.rotation = Vector3(0, 0, sin(u * 22.0) * 0.5)
		door.scale = Vector3(1, maxf(0.01, 1.0 - u), 1)
		ln.light_energy = 2.2 * (1.0 - u)
		if int(u * 8.0) != int((u - s.dt_last / 2.0) * 8.0): s.burst(glv.position, Color("eceaf2"), Color("9a96a8"), 8, 0.7, -1.0, 0.022, 0.8)
		await s.beat()
	glv.visible = false
	door.visible = false
	bc.visible = false
	s.main.sfx("door_shut", null, -6.0)
	await s.wait(1.8)
	_cat_shot(0.3, 0.8)
	cat.pose = "stand"
	await s.wait(0.8)
	await cat_say("...Three herrings.")
	await s.fade(1.0, 1.2)
	await s.title_card("TRAP TRICK", "End of Chapter Three", 5.0)
	_ghost(g, false)
	g.visible = false
	s.eye_h = 1.15
	s.cam_dist = 3.4
	a._free_people()


## Somewhere the scent leads: follow it (F shows it), and look closer.
func _clue(p: Vector3, text: String, f: Callable) -> void:
	var id: int = a.run_id
	s.ui.objective(text)
	scent = [p]
	await a.use(p, "Look closer", 1.5)
	if a.run_id != id: return
	scent = []
	s.film()
	s.hero.place(p + Vector3(0.45, 0, 0.45), PI * 1.25)
	cat.yaw = PI * 1.25
	cat.pose = "stand"
	await f.call()
	if a.run_id != id: return
	s.play()


func _scent_update(_dt: float) -> void:
	if scent.is_empty() or s.hero == null or s.mode != "play": return
	if not Input.is_physical_key_pressed(KEY_F) and not Input.is_joy_button_pressed(0, JOY_BUTTON_RIGHT_SHOULDER): return
	sway_t += _dt
	if sway_t < 0.06: return
	sway_t = 0.0
	var h: Vector3 = s.hero.position
	var pts: Array = [h] + _trail(h, scent[0])
	var left := 7.0 * fmod(s.time * 0.5, 1.0)
	for i in pts.size() - 1:
		var l: float = (pts[i + 1] - pts[i] as Vector3).length()
		if left < l:
			s.burst((pts[i] as Vector3).lerp(pts[i + 1], left / maxf(0.01, l)) + Vector3(0, 0.25, 0), Color("6a5a88"), Color("c8b4ff"), 3, 0.2, 0.1, 0.03, 1.4)
			return
		left -= l


## By the school's own paths.
func _trail(from: Vector3, to: Vector3) -> Array:
	var bi := 0
	var bj := 0
	for i in s.stage.nodes.size():
		var q: Vector3 = s.stage._np(i)
		if q.distance_to(from) < (s.stage._np(bi) as Vector3).distance_to(from): bi = i
		if q.distance_to(to) < (s.stage._np(bj) as Vector3).distance_to(to): bj = i
	var l: Array = []
	for q in s.stage.find_path(bi, bj): l.append(q.p)
	l.append(to)
	if l.size() > 1 and (l[0] as Vector3).distance_to(from) < 1.5: l.pop_front()
	return l


## The Proctor, and a weakness of his.
func _vane_puss(g: Node3D) -> void:
	s.film()
	var V := at("vane", -2.4, -14.8, PI / 2, FY[0])
	V.hold("L", s.prop("bullseye"), Transform3D(Basis(), Vector3(0, -0.42, 0.02)))
	g.place(Vector3(0.4, FY[0], -14.4), -PI / 2)
	cat.yaw = -PI / 2
	cat.pose = "crouch"
	V.feel("stern", "flat")
	V.look = g.position + Vector3(0, 0.3, 0)
	s.cut(Vector3(2.0, 0.7, -12.9), Vector3(-1.2, 0.9, -14.7), 48)
	await s.say("vane", "Who's there? Stand where you are!", { "eyes": "stern", "mouth": "shout" })
	await s.wait(0.8)
	V.feel("wide", "small")
	await s.wait(0.8)
	await s.say("vane", "...Puss.", { "eyes": "soft", "mouth": "small" })
	V.go_free([Vector3(-0.3, FY[0], -14.4)], 1.2)
	await s.until(func(): return V.path.is_empty(), 4.0)
	V.pose = "kneel"
	V.reach.R = g.position + Vector3(-0.1, 0.5, 0.0)
	cat.pose = "sit"
	s.cut(Vector3(0.5, 0.9, -11.8), Vector3(0.0, 0.72, -14.4), 50)
	await s.wait(0.8)
	s.main.sfx("purr")
	await s.say("vane", "Who's on duty, then? Are you on duty? Yes. So am I.", { "eyes": "happy", "mouth": "smile" })
	_cat_shot(0.4, 0.75)
	await cat_say("Thirty years a proctor, and he's the only one in the building who does behind the ears.", "The cat, privately")
	V.reach.R = null
	V.pose = "stand"
	await s.wait(1.0)
	s.face(V, 0.2, 1.5, 36)
	await s.say("vane", "...You saw nothing.", { "eyes": "stern", "mouth": "flat" })
	s.cut(Vector3(1.8, 0.9, -16.4), Vector3(-0.8, 1.0, -12.6), 48)
	V.go_free([Vector3(-1.4, FY[0], -11.0), Vector3(-1.0, FY[0], -7.7), Vector3(-9.0, FY[0], -7.7)], 1.2)
	await s.wait(1.2)
	drop(V, "L")
	V.visible = false
	s.play()


# ------------------------------------------------------------------- frame --
func update(dt: float) -> void:
	super.update(dt)
	_weather_update(dt)
	_follow_update(dt)
	_mana_update(dt)
	_cat_update(dt)
	_scent_update(dt)
	# his hair, in what wind there is
	var E: Node3D = s.actors.get("erebus")
	if E and E.visible and E.P.has("mane"):
		var w: float = 0.06 + storm * 0.25
		if still: w = 0.03
		(E.P.mane as Node3D).rotation = Vector3(0.05 + sin(s.time * 1.1) * w * 0.4, 0, sin(s.time * 0.9) * w)
		(E.P.mane2 as Node3D).rotation = Vector3(sin(s.time * 1.3 - 0.6) * w * 0.6, 0, sin(s.time * 1.1 - 0.8) * w * 1.3)
		(E.P.mane3 as Node3D).rotation = Vector3(sin(s.time * 1.5 - 1.2) * w * 0.8, 0, sin(s.time * 1.3 - 1.6) * w * 1.6)
