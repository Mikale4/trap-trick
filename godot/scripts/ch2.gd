extends "res://scripts/ch1.gd"
## Chapter Two: "What Chooses You". A few weeks on, everyone is handy with a candle, and the wandwright comes with her tub:
## a wand chooses its mage. None will have Reiner. Between the lessons are free afternoons: whom he spends them with (the
## sub-parts) is the player's choice, and changes how things go: who stands by him at the spoons, in the duet and at the last
## wand, who comes while he packs, how he gets out that night, what he sees on the roofs and whom he meets on the way.

const NAMES2 := ["A few weeks on", "The bucket", "A free afternoon", "A garden of wands", "Another afternoon", "Spoons", "Before the bell", "The duet", "The last free day", "The last wand", "The trunk", "On the roofs", "It wants something", "What it was"]
const FIRST := ["isolde", "tobin", "wim", "petra", "nadi", "otto", "selma", "kas", "maron", "bet"]
const KINDS := ["wand_oak", "wand_ash", "wand_cherry", "wand_holly", "wand_birch", "wand_plum"]

var wands: Array = []                 # { n, p, v, spin, st, yaw, roll, t }
var click := 0.0
var glim: Array = []                  # Trap Trick's shapes of light, drifting
var chase := {}                       # the black wand and its way with Reiner
var free_on := {}                     # the people to be found this afternoon
var slots := 0
var sprites: Array = []
const TUB_R := 0.42
var garden: Array = []                # the standing wands
var staff := {}
var down := false                     # Reiner's on the ground, and stays there


func list() -> Array: return [d1_weeks, d2_bucket, d3_free, d4_garden, d5_free, d6_spoons, d7_free, d8_duet, d9_free, d10_last, d11_trunk, d12_roofs, d13_chase, d14_staff]


func reset() -> void:
	for w in wands: if is_instance_valid(w.n): w.n.queue_free()
	wands = []
	for g in glim: if is_instance_valid(g.n): g.n.queue_free()
	glim = []
	for m in sprites: if is_instance_valid(m): m.queue_free()
	sprites = []
	chase = {}
	garden = []
	staff = {}
	down = false
	free_on = {}
	ups = {}
	slots = 0
	s.main.tt_pin = NAN
	vane = {}


func open(h: float) -> void:
	s.go_place("academy")
	s.campus.chapter = 2
	a._campus_busy(h)
	s.main.sound.air("school")
	a.ch1.levelled = true
	a.ch1.board(25, true)


func knows(w: String) -> int: return a.knows(w)


# -------------------------------------------------------------------- wands --
func wand(kind: String, p: Vector3) -> Dictionary:
	var n: Node3D = s.put(kind, p)
	for g in n.find_children("*", "GeometryInstance3D", true, false) + [n]:
		if g is GeometryInstance3D: g.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var w := { "n": n, "p": p, "v": Vector3.ZERO, "spin": Vector3.ZERO, "st": "lie", "yaw": randf() * TAU, "roll": 0.0, "t": randf() * 9.0, "kind": kind, "by": null }
	n.basis = Basis(Vector3.UP, w.yaw)
	wands.append(w)
	return w


## Tip them out of a mouth: they fall, bounce, roll and lie where they lie.
func spill(mouth: Vector3, dir: Vector3, n: int, secs: float) -> void:
	var side := Vector3(dir.z, 0, -dir.x)
	for i in n:
		var w := wand(KINDS[i % KINDS.size()], mouth + side * randf_range(-0.35, 0.35) + Vector3(0, randf_range(-0.1, 0.15), 0))
		w.v = dir * randf_range(0.7, 3.0) + side * randf_range(-1.5, 1.5) + Vector3(0, randf_range(-0.3, 1.0), 0)
		w.spin = Vector3(randf_range(-9, 9), randf_range(-7, 7), randf_range(-9, 9))
		w.st = "air"
		w.n.rotation = Vector3(randf() * TAU, randf() * TAU, 0)
		if i % 2 == 0: await s.wait(secs / n * 2.0)


func _wand_update(w: Dictionary, dt: float) -> void:
	w.t += dt
	var n: Node3D = w.n
	match w.st:
		"air", "hop":
			w.v.y -= 9.81 * dt
			w.p += w.v * dt
			n.basis = Basis(Vector3(1, 0, 0), w.spin.x * dt) * Basis(Vector3(0, 1, 0), w.spin.y * dt) * n.basis
			if w.p.y < float(w.get("floor", 0.0)) + 0.036:
				w.p.y = float(w.get("floor", 0.0)) + 0.036
				if click <= 0.0 and absf(w.v.y) > 0.5:
					s.main.sfx("clack", null, clampf(absf(w.v.y) * 3.0 - 14.0, -16.0, -2.0))
					click = 0.035
				if w.st == "hop" and int(w.get("hops", 0)) > 0:
					w.hops -= 1
					w.v.y = 1.5
				elif absf(w.v.y) > 0.7:
					w.v = Vector3(w.v.x * 0.62, -w.v.y * 0.3, w.v.z * 0.62)
					w.spin *= 0.5
				else:
					w.st = "roll"
					w.v.y = 0.0
					if Vector2(w.v.x, w.v.z).length() > 0.05: w.yaw = atan2(w.v.x, w.v.z) + PI / 2
		"roll":                                          # on its side, its axis across the way it rolls; the ground slows it
			var v2 := Vector2(w.v.x, w.v.z)
			var sp: float = v2.length()
			if sp < 0.04:
				w.st = "lie"
				w.v = Vector3.ZERO
			else:
				var ns := maxf(0.0, sp - 1.3 * dt)
				w.v = Vector3(w.v.x / sp * ns, 0, w.v.z / sp * ns)
				w.p += w.v * dt
				w.roll += ns * dt / 0.024
			n.basis = n.basis.orthonormalized().slerp(Basis(Vector3.UP, w.yaw) * Basis(Vector3.BACK, 0.0), 1.0 - exp(-10.0 * dt)) if sp < 0.04 else (Basis(Vector3.UP, w.yaw) * Basis(Vector3.BACK, -w.roll))
		"lie": n.basis = n.basis.orthonormalized().slerp(Basis(Vector3.UP, w.yaw), 1.0 - exp(-10.0 * dt))
		"tremble": n.basis = Basis(Vector3.UP, w.yaw + sin(w.t * 46.0) * 0.09)
		"held": return
	n.position = w.p


## Tip the tub: it goes over on the front edge of its foot, and lies on its side.
func tip(tb: Node3D, secs: float) -> void:
	var p: Vector3 = tb.position
	var t0: float = s.time
	while s.time < t0 + secs:
		var th: float = pow((s.time - t0) / secs, 1.7) * 1.446
		tb.rotation.x = th
		tb.position = Vector3(p.x, p.y + TUB_R * sin(th), p.z + TUB_R * (1.0 - cos(th)))
		await s.beat()
	s.main.sfx("thump", null, -8.0)


## Away from a point, as far as a ring about it: each with just the push that brings it to rest there.
func flee(c: Vector3, r: float) -> void:
	for w in wands:
		if not (w.st in ["lie", "roll", "tremble"]): continue
		var d: Vector3 = w.p - c
		d.y = 0.0
		if d.length() > r: continue
		var dir := d.normalized() if d.length() > 0.05 else Vector3(1, 0, 0)
		w.st = "roll"
		w.v = dir * sqrt(2.0 * 1.3 * (r - d.length() + randf_range(0.0, 0.14)))
		w.yaw = atan2(dir.x, dir.z) + PI / 2


func near_wand(p: Vector3, kind := "") -> Dictionary:
	var best := {}
	var bd := INF
	for w in wands:
		if w.by != null or not (w.st in ["lie", "roll", "tremble"]) or (kind != "" and w.kind != kind): continue
		var d: float = (w.p - p).length()
		if d < bd:
			bd = d
			best = w
	return best


const GRIP := Transform3D(Vector3(1, 0, 0), Vector3(0, 0, 1), Vector3(0, -1, 0), Vector3(0, -0.07, 0.03))


## Up off the ground and into someone's hand.
func to_hand(w: Dictionary, who: Node3D, secs := 0.9, arc := 0.6) -> void:
	w.by = who
	w.st = "fly"
	var p0: Vector3 = w.p
	var t0: float = s.time
	while s.time < t0 + secs:
		var u: float = smoothstep(0.0, 1.0, (s.time - t0) / secs)
		w.p = p0.lerp(who.hand_pos("R"), u) + Vector3(0, sin(u * PI) * arc, 0)
		w.n.position = w.p
		w.n.rotation = Vector3(u * 9.0, u * 7.0, 0)
		if randf() < 0.4: s.sparkle(w.p, 1, Color("ffe8a0"))
		await s.beat()
	give(w, who)
	s.main.sfx("catch")
	s.sparkle(who.hand_pos("R"), 10)


func give(w: Dictionary, who: Node3D) -> void:
	w.by = who
	w.st = "held"
	who.hold("R", w.n, GRIP)


# --- what they turn into. A wand that finds its mage takes the shape of what's truest of them: where its light comes from
# (voxels up it), its colours, how that rises or falls, how fast, how big, how long it lasts, how much of it there is
const FORMS := {
	"isolde": [22, "e8f8ff", "9fe8ff", -0.35, 0.3, 0.022, 1.6, 12], "petra": [15, "ffd24a", "ff5a1a", 1.8, 0.5, 0.032, 0.7, 26],
	"otto": [18, "ffffff", "f4e8d0", 0.5, 0.2, 0.034, 1.4, 9], "kas": [17, "ffc4dc", "9ad86a", -0.5, 0.4, 0.026, 1.8, 10],
	"wim": [15, "ffe0a0", "f2a0b8", 0.25, 0.2, 0.022, 1.5, 6], "bet": [17, "ffffff", "ffd8a0", 0.6, 0.2, 0.036, 1.4, 12],
	"tobin": [17, "ffe9a8", "d8a838", 0.15, 0.5, 0.02, 1.0, 8], "selma": [18, "fff2bc", "9ab4ff", 0.2, 0.15, 0.024, 2.2, 10],
	"nadi": [16, "fffbe0", "7ac8ff", 0.0, 1.8, 0.02, 0.3, 18], "cassian": [13, "ffffff", "d8ecf8", 0.0, 0.3, 0.018, 0.8, 5],
	"odile": [17, "ffd0ea", "f28ab4", -0.4, 0.25, 0.022, 1.6, 6], "lucan": [12, "ffe2a0", "ffb040", 0.3, 0.2, 0.02, 1.4, 8],
	"sibyl": [12, "ffe2a0", "d8b050", -0.7, 0.1, 0.018, 1.0, 10], "dorn": [17, "9ad86a", "e8e0d0", -0.2, 0.2, 0.022, 1.6, 5],
	"thorne": [12, "e8d0a0", "d0a860", -0.8, 0.3, 0.024, 1.0, 5],
}
var ups := {}                         # held up to be looked at: who -> how far it leans


func form(who: String) -> Node3D:
	var f: Array = FORMS[who]
	var n: Node3D = s.prop("form_" + who)
	for g in n.find_children("*", "GeometryInstance3D", true, false) + [n]:
		if g is GeometryInstance3D: g.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var p := GPUParticles3D.new()
	p.amount = f[7]
	p.lifetime = f[6]
	p.local_coords = false
	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
	pm.emission_sphere_radius = 0.1
	pm.direction = Vector3(0, 1, 0)
	pm.spread = 180.0
	pm.initial_velocity_min = float(f[4]) * 0.3
	pm.initial_velocity_max = f[4]
	pm.gravity = Vector3(0, f[3], 0)
	var cv := Curve.new()
	cv.add_point(Vector2(0, 0.2))
	cv.add_point(Vector2(0.25, 1))
	cv.add_point(Vector2(1, 0))
	var ct := CurveTexture.new()
	ct.curve = cv
	pm.scale_curve = ct
	var gr := Gradient.new()
	gr.set_color(0, Color(f[1]))
	gr.set_color(1, Color(f[2]))
	var gt := GradientTexture1D.new()
	gt.gradient = gr
	pm.color_initial_ramp = gt
	p.process_material = pm
	var m := BoxMesh.new()
	m.size = Vector3.ONE * float(f[5])
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.vertex_color_use_as_albedo = true
	m.material = mat
	p.draw_pass_1 = m
	p.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	p.position = Vector3(-0.144 if who == "lucan" else 0.0, 0, float(f[0]) * 0.024)
	n.add_child(p)
	if who in ["petra", "lucan", "nadi", "selma"]:
		var l := OmniLight3D.new()
		l.light_color = Color(f[1])
		l.light_energy = 0.35
		l.omni_range = 2.4
		l.position = p.position
		n.add_child(l)
	return n


## Up beside the face, upright, for everyone to see.
func raise(who: String, tilt := 0.15) -> void:
	var P := act(who)
	var fw := Vector3(sin(P.yaw), 0, cos(P.yaw))
	P.gest = ""
	P.reach.R = P.position + fw * 0.34 + Vector3(-cos(P.yaw), 0, sin(P.yaw)) * 0.2 + Vector3(0, P.head_pos().y - P.position.y - 0.4, 0)
	P.hand.R = "hold"
	ups[who] = tilt


func lower(who: String) -> void:
	var P := act(who)
	ups.erase(who)
	P.reach.R = null
	if P.held.R: (P.held.R as Node3D).transform = GRIP


func reveal(who: String, side := 0.28, d := 1.75) -> void:
	var P := act(who)
	var y: float = P.head_pos().y
	var c: Vector3 = P.position + Vector3(sin(P.yaw), 0, cos(P.yaw)) * 0.12 + Vector3(-cos(P.yaw), 0, sin(P.yaw)) * 0.1
	s.cut(Vector3(c.x + sin(P.yaw + side) * d, y + 0.02, c.z + cos(P.yaw + side) * d), Vector3(c.x, y - 0.06, c.z), 42)


## A wand finds its mage: light winds in about it, and it's what they are.
func become(who: String, cam := true) -> void:
	var P := act(who)
	var f: Array = FORMS[who]
	var c1 := Color(f[1])
	var c2 := Color(f[2])
	P.face_yaw = null if P.path.is_empty() else P.face_yaw
	raise(who)
	if cam: reveal(who)
	s.main.sfx("become")
	var t0: float = s.time
	var last := 0.0
	while s.time < t0 + 0.75:
		var u: float = (s.time - t0) / 0.75
		if s.time > last + 0.045:
			last = s.time
			for k in 2:
				var an: float = u * 13.0 + k * PI
				s.burst(P.hand_pos("R") + Vector3(cos(an) * 0.42 * (1.1 - u), u * 0.4 - 0.1, sin(an) * 0.42 * (1.1 - u)), c1, c2, 3, 0.25, 0.0, 0.028, 0.6)
		await s.beat()
	drop(P, "R")
	var n := form(who)
	P.hold("R", n, GRIP)
	s.burst(P.hand_pos("R") + Vector3(0, 0.3, 0), c1, c2, 46, 2.4, clampf(float(f[3]), -1.0, 1.0), 0.034, 1.0)
	s.shake = 0.12
	t0 = s.time
	while s.time < t0 + 0.4:
		var u: float = (s.time - t0) / 0.4
		n.set_meta("k", 0.15 + 0.85 * u + sin(u * PI) * 0.22)
		await s.beat()
	n.set_meta("k", 1.0)


func _ups_update() -> void:
	for w in ups:
		var P := act(w)
		var n: Node3D = P.held.R
		if n == null: continue
		var k: float = n.get_meta("k") if n.has_meta("k") else 1.0
		n.global_transform = Transform3D((Basis(Vector3.UP, P.yaw + P.get_meta("twist", 0.0)) * Basis(Vector3.RIGHT, -PI / 2 + float(ups[w]))).scaled(Vector3.ONE * k), P.hand_pos("R"))


## Everyone with what's theirs (for a scene after they've got it). Maron's is still a plain stick.
func armed(l: Array) -> void:
	for n in l: act(n).hold("R", form(n) if FORMS.has(n) else s.prop("wand_oak"), GRIP)


func disarm(l: Array) -> void:
	for n in l:
		ups.erase(n)
		act(n).reach.R = null
		drop(act(n), "R")


# -------------------------------------------------------------- shapes of light --
func shape(p: Vector3, v := Vector3.ZERO, secs := 1.6, sc := 1.0) -> void:
	var n: Node3D = s.put(["suit_heart", "suit_spade", "suit_diamond", "suit_club"][randi() % 4], p, 0.0, sc)
	for g in n.find_children("*", "GeometryInstance3D", true, false) + [n]:
		if g is GeometryInstance3D: g.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	glim.append({ "n": n, "t": 0.0, "d": secs, "v": v, "sc": sc, "sp": randf_range(-2.5, 2.5) })


## A little moonlight on a face.
func moon(p: Vector3, e := 0.8, c := Color("b4c4ff"), r := 6.0) -> OmniLight3D:
	var l := OmniLight3D.new()
	l.position = p
	l.light_color = c
	l.light_energy = e
	l.omni_range = r
	s.add_child(l)
	a.keep(l)
	return l


func update(dt: float) -> void:
	click -= dt
	if down and s.hero: s.hero.gest_t = 14.0
	for w in wands: if is_instance_valid(w.n): _wand_update(w, dt)
	for g in glim.duplicate():
		g.t += dt
		if g.t > g.d or not is_instance_valid(g.n):
			if is_instance_valid(g.n): g.n.queue_free()
			glim.erase(g)
			continue
		var u: float = g.t / g.d
		(g.n as Node3D).position += (g.v as Vector3) * dt
		(g.n as Node3D).rotation.y += g.sp * dt
		(g.n as Node3D).scale = Vector3.ONE * maxf(0.01, g.sc * smoothstep(0.0, 0.15, u) * (1.0 - smoothstep(0.55, 1.0, u)))
	if not vane.is_empty() and vane.has("pts"): _vane_update(dt)
	for i in sprites.size():
		if is_instance_valid(sprites[i]): sprites[i].rotation.y = s.time * 2.0
	for k in free_on:
		var f: Dictionary = free_on[k]
		if f.has("m") and is_instance_valid(f.m):
			(f.m as Node3D).position = Vector3(f.p.x, f.p.y + f.top + sin(s.time * 2.4) * 0.05, f.p.z)
			(f.m as Node3D).rotation.y = s.time * 1.8
	_ups_update()
	_garden_update(dt)
	if not chase.is_empty(): _chase_update(dt)
	if not staff.is_empty(): _staff_update(dt)


# ==================================================================== 1 == --
func d1_weeks() -> void:
	open(18.8)
	s.film()
	music("evening")
	s.main.sound.air("room")
	var seats: Array = [["reiner_uni", 11.3, -11.7, PI], ["wim", 12.25, -11.7, PI], ["bet", 13.2, -11.7, PI], ["maron", 14.15, -11.7, PI], ["otto", 15.1, -11.7, PI], ["nadi", 11.3, -13.1, 0.0], ["petra", 12.25, -13.1, 0.0], ["kas", 13.2, -13.1, 0.0], ["tobin", 14.15, -13.1, 0.0], ["isolde", 15.1, -13.1, 0.0],
		["cassian", 12.25, -15.9, 0.0], ["odile", 13.2, -15.9, 0.0], ["ilse", 11.3, -14.5, PI], ["rowan", 15.1, -14.5, PI], ["joss", 14.15, -14.5, PI], ["lucan", 14.15, -15.9, 0.0], ["dorn", 15.1, -15.9, 0.0], ["sibyl", 11.3, -15.9, 0.0]]
	take(PUP + ["cassian", "odile", "lucan", "dorn", "sibyl", "halden", "thorne", "aurel", "dorle"])
	for n in PUP: act(n).visible = false
	clear(13, -14, 8)
	var R := reiner(11.3, -11.7, PI, FY[0])
	var fl := {}
	for d in seats:
		var p: Node3D = R if d[0] == "reiner_uni" else at(d[0], d[1], d[2], d[3], FY[0])
		p.sit(0.46, "sit")
		p.lod = 0 if float(d[2]) > -13.4 or d[0] in ["cassian", "odile"] else 1
		if float(d[2]) > -14.0:
			var cz: float = -12.1 if float(d[2]) > -12.0 else -12.7
			a.keep(s.put("candle", Vector3(float(d[1]) + 0.25, FY[0] + 0.744, cz)))
			fl[d[0]] = flame(Vector3(float(d[1]) + 0.25, FY[0] + 0.744 + 0.285, cz), 0.7, d[0] in ["reiner_uni", "kas", "otto"])
	s.move(Vector3(13, 13, 34), Vector3(0, 9, -6), Vector3(5, 7, 26), Vector3(0, 8, -6), 6.0, 44)
	await s.fade(0.0, 1.4)
	s.main.sfx("bell")
	s.stage.ring_bell()
	s.campus._ring_wave()
	await s.wait(0.8)
	await s.title_card("CHAPTER TWO", "What Chooses You", 4.4)
	s.move(Vector3(17.6, 2.3, -10.2), Vector3(12, 1.0, -13), Vector3(15.8, 1.8, -10.4), Vector3(12, 1.0, -12.6), 5.0, 54)
	s.ui.place("A few weeks on")
	await s.wait(2.4)
	# everyone's handy with a candle now
	seat_face(act("petra"), 1.2, 42)
	for k in 8:
		fl.petra.n.position = Vector3(12.5 + sin(k * 0.8) * 0.16, FY[0] + 1.12 + cos(k * 0.8) * 0.12, -12.7)
		await s.wait(0.16)
	await s.say("petra", "Look! It does loops. Nobody taught it loops.", { "eyes": "happy", "mouth": "grin" })
	seat_face(act("wim"), 1.2, 42)
	await s.say("wim", "Mine's a cat. Nearly. It's got the ears.", { "eyes": "soft", "mouth": "smile" })
	seat_face(R, 1.15, 42)
	R.reach.R = R.position + Vector3(0.3, 1.0, -0.42)
	R.hand.R = "open"
	R.look = fl.reiner_uni.n
	var t0: float = s.time
	var f0: Vector3 = fl.reiner_uni.n.position
	while s.time < t0 + 1.6:
		fl.reiner_uni.n.position = f0.lerp(R.hand_pos("R") + Vector3(0, 0.1, -0.02), smoothstep(0.0, 1.0, (s.time - t0) / 1.4))
		await s.beat()
	R.feel("soft", "smile")
	await s.say("reiner_uni", "It likes the palm best. It says the wick's a bit formal.", { "eyes": "soft", "mouth": "smile" })
	var M: Node3D = act("maron")
	seat_face(M, 1.2, 38)
	M.look = R
	M.feel("soft", "smile")
	await s.wait(1.3)
	# the Wits
	music("wits")
	var C: Node3D = act("cassian")
	var O: Node3D = act("odile")
	R.reach.R = null
	R.hand.R = ""
	fl.reiner_uni.n.position = f0
	C.look = R
	O.look = C
	s.cut(Vector3(12.75, 1.6, -14.1), Vector3(12.72, 1.18, -15.9), 46)
	await s.say("cassian", "\"It says the wick's a bit formal.\"", { "eyes": "half", "mouth": "smirk", "do": "offer2" })
	O.feel("happy", "smile")
	O.do("giggle", 1.6)
	await s.say("cassian", "\"It's a nice night. You needn't hurry.\" ...Have I got the vowels? I want to do him justice.", { "eyes": "happy", "mouth": "grin", "do": "chest" })
	s.main.sfx("laugh", null, -8.0)
	for n in ["ilse", "rowan", "joss"]:
		act(n).do("laugh", 1.8)
		act(n).feel("happy", "grin")
	await s.wait(1.2)
	s.face(O, 0.0, 1.2, 38)
	O.look = R
	await s.say("odile", "Don't mind Cassian. He only does people he's noticed.", { "eyes": "soft", "mouth": "smile" })
	seat_face(R, 1.15, 40)
	R.look = null
	R.feel("down", "wavy")
	await s.wait(1.4)
	# the tub
	var H := at("halden", 8.6, -10.2, PI * 0.6, FY[0])
	s.main.sfx("clunk")
	s.face(H, 0.2, 1.5, 36)
	for d in seats: act(d[0]).look = H
	await s.say("halden", "You can all light a candle. One or two of you could light a street. It is time you were given something to point with.", { "eyes": "half", "mouth": "flat" })
	var T := at("thorne", 8.5, -8.0, PI, FY[0])
	s.main.sfx("door")
	var tb: Node3D = a.keep(s.put("tub", Vector3(8.5, FY[0], -9.0)))
	var tf: Node3D = s.prop("tubfill")
	tb.add_child(tf)
	T.reach.R = tb.position + Vector3(-0.3, 1.1, 0.2)
	T.reach.L = tb.position + Vector3(0.3, 1.1, 0.2)
	H.go_free([Vector3(7.4, FY[0], -10.8)], 1.3)
	s.cut(Vector3(10.9, 1.5, -12.4), Vector3(8.5, 1.0, -9.4), 42)
	t0 = s.time
	music("bucket")
	while s.time < t0 + 2.6:
		var u: float = (s.time - t0) / 2.6
		tb.position.z = -8.7 - u * 1.5
		tb.rotation.y = sin(u * 20.0) * 0.12
		T.position.z = tb.position.z + 0.75
		T.prev_pos = T.position
		T.reach.R = tb.position + Vector3(-0.3, 1.1, 0.2)
		T.reach.L = tb.position + Vector3(0.3, 1.1, 0.2)
		if int(u * 14.0) != int((u - s.dt_last / 2.6) * 14.0): s.main.sfx("clack", null, -6.0)
		await s.beat()
	T.reach = { "L": null, "R": null }
	for d in seats: act(d[0]).look = T
	s.face(T, 0.2, 1.6, 36)
	await s.say("thorne", "Mind your feet, mind your elbows. That's four hundred wands in there, and not one of them patient.", { "eyes": "happy", "mouth": "grin" })
	await s.say("thorne", "You'll have heard people choose a wand. They don't. A wand's a stick that's made up its mind.", { "eyes": "open", "mouth": "smile", "do": "pointup", "d": 2.2 })
	await s.say("thorne", "And when it's found who it was after, it stops being a stick. It turns into whatever you are, underneath. A fire. A feeling. The thing you want most in the world, and never said. We'd a lad whose was a door.", { "eyes": "soft", "mouth": "smile" })
	s.cut(Vector3(15.9, 1.7, -10.4), Vector3(12.4, 1.0, -12.4), 50)
	await s.say("thorne", "Tomorrow, in the yard. Bring your hands. Wash them first; they notice.", { "eyes": "soft", "mouth": "smile" })
	seat_face(R, 1.15, 40)
	R.look = tb
	R.feel("wide", "smile")
	await s.say("reiner_uni", "What if one doesn't?", { "eyes": "worry", "mouth": "smile" })
	var W: Node3D = act("wim")
	seat_face(W, 1.2, 40)
	W.look = R
	await s.say("wim", "There's four hundred, Reiner. There's bound to be one that's not fussy.", { "eyes": "soft", "mouth": "smile" })
	await s.fade(1.0, 1.0)
	a._free_people()


# ==================================================================== 2 == --
const ARC := [["isolde", -0.2], ["wim", 0.35], ["petra", 0.8], ["otto", 1.25], ["bet", 1.7], ["kas", 2.15], ["selma", -0.75], ["tobin", -1.25], ["nadi", -1.75], ["maron", -2.25]]
const YARD := Vector3(-33.6, 0, -8.0)


func _yard_ring(r := 3.9) -> void:
	for q in ARC:
		var p := at(q[0], YARD.x + sin(q[1]) * r, YARD.z + cos(q[1]) * r, float(q[1]) + PI)
		p.look = YARD


func d2_bucket() -> void:
	open(15.1)
	s.film()
	music("bucket")
	take(FIRST + ["thorne", "corvin", "cassian", "odile"])
	clear(-33, -8, 13)
	_yard_ring()
	var R := reiner(YARD.x + sin(-2.75) * 3.9, YARD.z + cos(-2.75) * 3.9, -2.75 + PI)
	R.look = YARD
	var T := at("thorne", YARD.x + 1.0, YARD.z - 3.9, -0.2)
	var tb: Node3D = a.keep(s.put("tub", Vector3(YARD.x + 0.1, 0, YARD.z - 3.4)))
	var tf: Node3D = s.prop("tubfill")
	tb.add_child(tf)
	T.look = tb
	var C := at("cassian", -27.2, -5.2, -PI / 2)
	var O := at("odile", -27.0, -4.0, -PI / 2)
	var board: Node3D = s.prop("tally")
	a.keep(board)
	s.add_child(board)
	board.position = Vector3(-26.3, 0.5, -4.8)
	board.rotation.y = -PI / 2
	s.move(Vector3(-27.6, 3.0, -0.6), Vector3(-33.6, 0.8, -8), Vector3(-29.6, 2.2, -3.2), Vector3(-33.6, 0.8, -8.6), 5.0, 48)
	await s.fade(0.0, 0.9)
	await s.say("thorne", "Stand back. Further. They've not been out since spring.", { "eyes": "happy", "mouth": "grin" })
	# over it goes
	T.reach.R = tb.position + Vector3(0.45, 1.1, 0.0)
	s.cut(Vector3(-30.6, 1.5, -7.0), Vector3(-33.6, 0.7, -10.6), 46)
	await tip(tb, 1.0)
	tf.visible = false
	T.reach = { "L": null, "R": null }
	s.main.sfx("spill")
	s.shot.p1 = Vector3(-31.6, 2.1, -6.0)
	s.shot.l1 = Vector3(-33.6, 0.1, -8.9)
	s.shot.t = 0.0
	s.shot.d = 2.6
	await spill(tb.position + Vector3(0, 0.1, 1.0), Vector3(0, 0, 1), 72, 1.5)
	await s.wait(1.6)
	s.main.sfx("gasp", null, -6.0)
	await s.say("thorne", "Hands out. Palms up. Don't grab, it's rude. And don't want one too hard. They can smell it.", { "eyes": "open", "mouth": "smile", "do": "offer2", "d": 2.4 })
	# one by one
	var I: Node3D = act("isolde")
	I.do("offer", 1.6)
	s.two(I, act("wim"), -1.0, 3.0, 40, 0.0)
	var w := near_wand(I.position, "wand_birch")
	await to_hand(w, I, 0.5, 0.2)
	await become("isolde")
	await s.say("isolde", "A quill. Yes. Obviously.", { "eyes": "half", "mouth": "flat" })
	ups.isolde = 0.15
	var t1: float = s.time
	while s.time < t1 + 0.9:                              # (it writes something, in the air)
		I.set_meta("twist", sin(s.time * 16.0) * 0.5)
		s.sparkle(I.hand_pos("R") + Vector3(sin(s.time * 9.0) * 0.12, 0.5, 0), 1, Color("9fe8ff"))
		await s.beat()
	I.remove_meta("twist")
	s.main.sfx("chalk", null, -6.0)
	await s.say("isolde", "It has underlined \"obviously.\"", { "eyes": "wide", "mouth": "small" })
	lower("isolde")
	var OT: Node3D = act("otto")
	s.face(OT, 0.3, 1.8, 38, -0.1)
	w = near_wand(OT.position, "wand_oak")
	OT.do("offer", 2.0)
	await to_hand(w, OT, 1.1, 0.7)
	await s.say("otto", "It smells of gravy!", { "eyes": "happy", "mouth": "grin" })
	await become("otto")
	OT.feel("wide", "oh")
	await s.wait(0.5)
	await s.say("otto", "Oh, it's beautiful.", { "eyes": "soft", "mouth": "grin" })
	lower("otto")
	var ND: Node3D = act("nadi")
	w = near_wand(ND.position, "wand_ash")
	ND.do("offer", 1.0)
	await to_hand(w, ND, 0.3, 0.1)
	await become("nadi")
	s.main.sfx("spark")
	await s.say("nadi", "It's lightning! It talks! It talks faster than I do! Nobody talks faster than I do!", { "eyes": "happy", "mouth": "shout" })
	lower("nadi")
	var P: Node3D = act("petra")
	w = near_wand(P.position, "wand_cherry")
	w.st = "hop"
	w.hops = 7
	w.v = (P.position - YARD).normalized() * 0.2 + Vector3(1.9, 1.6, 0.9)
	w.by = P
	w.spin = Vector3(8, 6, 0)
	P.feel("happy", "shout")
	s.cut(Vector3(-25.4, 1.6, -0.4), Vector3(-30.2, 0.8, -4.8), 46)
	P.go_free([w.p + Vector3(0.6, 0, 0.6), Vector3(-29.4, 0, -5.2), Vector3(-29.0, 0, -2.6)], 3.2)
	await s.say("petra", "Come BACK! I LIKE you!", { "eyes": "happy", "mouth": "shout" })
	P.path = []
	P.turn_to(Vector3(-27.0, 0, -0.6))
	await s.wait(0.3)
	await to_hand(w, P, 0.7, 1.0)
	await become("petra")
	s.main.sfx("ignite")
	await s.say("petra", "It's FIRE! It was only playing! It's fire all the way DOWN!", { "eyes": "happy", "mouth": "shout" })
	lower("petra")
	var K: Node3D = act("kas")
	K.do("offer", 2.4)
	s.face(K, 0.3, 1.5, 38, -0.1)
	w = near_wand(K.position, "wand_holly")
	await to_hand(w, K, 1.2, 0.5)
	drop(K, "R")
	w.n = s.prop("wand_leaf")
	give(w, K)
	s.sparkle(K.hand_pos("R"), 10, Color("a0f090"))
	await s.say("kas", "It's put out a leaf. Hello. Hello.", { "eyes": "soft", "mouth": "smile" })
	await become("kas")
	await s.say("kas", "...And all the rest of you.", { "eyes": "happy", "mouth": "smile" })
	lower("kas")
	P.place(Vector3(YARD.x + sin(0.8) * 3.9, 0, YARD.z + cos(0.8) * 3.9), 0.8 + PI)
	var W: Node3D = act("wim")
	w = near_wand(W.position, "wand_ash")
	w.by = W
	w.st = "hop"
	w.hops = 3
	var d: Vector3 = W.position - w.p
	w.v = Vector3(d.x, 0, d.z) / 1.25 + Vector3(0, 1.5, 0)
	W.feel("wide", "oh")
	s.face(W, 0.3, 1.9, 40, -0.2)
	await s.wait(1.3)
	W.do("flinch", 0.9)
	w.st = "lie"
	w.p = W.position - Vector3(sin(W.yaw), 0, cos(W.yaw)) * 0.35
	w.n.position = w.p
	await s.say("wim", "It's behind me. It's hiding behind me. It's frightened. ...It's all right. So am I.", { "eyes": "worry", "mouth": "smile" })
	await to_hand(w, W, 0.8, 0.2)
	await become("wim")
	await s.say("wim", "It's a cat. ...It's got the ears!", { "eyes": "happy", "mouth": "grin" })
	lower("wim")
	var SE: Node3D = act("selma")
	SE.feel("shut", "flat")
	w = near_wand(SE.position, "wand_plum")
	await to_hand(w, SE, 0.5, 0.2)
	await become("selma")
	SE.feel("half", "smile")
	await s.say("selma", "Mm. It's a nap.", { "eyes": "shut", "mouth": "smile" })
	lower("selma")
	var B: Node3D = act("bet")
	w = wand("wand_oak", YARD + Vector3(0.4, 0.03, 0.4))
	w.st = "roll"
	d = B.position - w.p
	w.v = Vector3(d.x, 0, d.z).normalized() * 2.9
	w.yaw = atan2(w.v.x, w.v.z) + PI / 2
	s.face(B, 0.2, 1.9, 40, -0.3)
	await s.wait(1.4)
	B.do("flinch", 0.7)
	s.main.sfx("clunk")
	await s.say("bet", "Ow! That's no wand, that's a rolling pin. ...It's mine, isn't it.", { "eyes": "half", "mouth": "grin" })
	B.do("pickup", 1.0)
	await s.wait(0.9)
	give(w, B)
	await become("bet")
	B.feel("wide", "small")
	await s.wait(0.9)
	await s.say("bet", "It's a ladle.", { "eyes": "wide", "mouth": "small" })
	s.face(act("otto"), 0.2, 1.5, 38)
	await s.say("otto", "We could have dinner.", { "eyes": "happy", "mouth": "smile" })
	reveal("bet", 0.1, 1.4)
	B.feel("soft", "wavy")
	await s.wait(1.0)
	await s.say("bet", "...It's OUR ladle.", { "eyes": "soft", "mouth": "wavy" })
	lower("bet")
	var TO: Node3D = act("tobin")
	w = near_wand(TO.position, "wand_plum")
	TO.do("offer", 2.0)
	s.face(TO, 0.3, 1.5, 38, -0.1)
	await to_hand(w, TO, 1.0, 0.6)
	await become("tobin")
	await s.say("tobin", "It's a trumpet. The wrong way round.", { "eyes": "worry", "mouth": "flat" })
	s.face(T, 0.2, 1.6, 36)
	T.look = TO
	await s.say("thorne", "Right way round, my love. Put it to your ear.", { "eyes": "soft", "mouth": "smile" })
	reveal("tobin")
	TO.reach.R = TO.head_pos() + Vector3(-cos(TO.yaw), 0, sin(TO.yaw)) * 0.3 + Vector3(0, -0.06, 0)
	TO.feel("wide", "small")
	await s.wait(1.2)
	await s.say("tobin", "...I can hear the fish.", { "eyes": "wide", "mouth": "smile" })
	lower("tobin")
	# Maron
	var M: Node3D = act("maron")
	s.face(M, -0.2, 1.4, 34)
	M.feel("half", "flat")
	M.look = YARD
	await s.wait(0.6)
	s.cut(Vector3(-30.4, 1.8, -5.6), YARD + Vector3(0, 0.1, 0), 46)
	s.main.sfx("chirp", null, -6.0)
	for x in wands: if x.by == null and x.st in ["lie", "roll"]: x.st = "tremble"
	await s.wait(1.3)
	s.face(M, -0.2, 1.2, 32)
	M.feel("stern", "flat")
	M.do("shake", 0.7)
	await s.wait(0.8)
	for x in wands: if x.st == "tremble": x.st = "lie"
	M.feel("half", "flat")
	w = near_wand(M.position)
	M.do("pickup", 1.2)
	await s.wait(0.6)
	give(w, M)
	s.main.sfx("catch")
	await s.wait(0.8)
	raise("maron")
	reveal("maron", -0.2, 1.6)
	await s.say("maron", "This one will do.", { "eyes": "half", "mouth": "flat" })
	await s.wait(0.5)
	s.face(T, 0.2, 1.6, 36)
	T.look = M
	await s.say("thorne", "It's not turned a hair. They only hold their shape for two sorts of people, love. Them they don't want...", { "eyes": "half", "mouth": "smile" })
	s.face(M, -0.2, 1.1, 32)
	M.feel("half", "flat")
	await s.say("thorne", "...and them as are already taken.", { "as": "Mistress Thorne" })
	M.feel("wide", "small", 1.2)
	await s.wait(1.2)
	await s.say("maron", "It's shy.", { "eyes": "lookL", "mouth": "flat" })
	lower("maron")
	# and Reiner
	music("")
	T.look = R
	R.path = []
	s.face(R, 0.2, 1.5, 38)
	R.feel("soft", "smile")
	await s.say("thorne", "And you, my love. In you come. Right to the middle.", { "eyes": "soft" })
	R.go_free([YARD + Vector3(-0.2, 0, -0.3)], 1.2)
	s.cut(Vector3(-31.0, 3.4, -4.4), YARD + Vector3(0, 0.6, -0.6), 48)
	await s.until(func(): return R.path.is_empty(), 6.0)
	R.face_yaw = 0.0
	s.cut(YARD + Vector3(1.8, 1.3, 2.6), R.head_pos() - Vector3(0, 0.3, 0), 40)
	R.pose = "cast"
	await s.cast([["If", "U"], ["you'd", "L"], ["like", "R"], ["to", "D"], ["I'm", "L"], ["here", "U"]], { "gap": 0.95, "wide": 0.3, "name": "Palm up. Don't grab" })
	R.pose = "stand"
	R.reach.R = YARD + Vector3(-0.2, 1.05, 0.25)
	R.hand.R = "open"
	s.cut(Vector3(-30.4, 4.2, -4.4), YARD + Vector3(0, 0.5, 0), 50)
	await s.wait(1.4)
	s.main.sfx("roll")
	flee(R.position, 2.9)
	await s.wait(2.6)
	R.feel("wide", "flat")
	s.face(R, 0.2, 1.4, 36)
	await s.wait(1.2)
	s.main.sfx("gasp")
	for n in FIRST: act(n).look = R
	await s.say("thorne", "Well. I've never seen that.", { "as": "Mistress Thorne" })
	R.reach.R = null
	R.hand.R = ""
	R.look = T
	await s.say("reiner_uni", "Is it... does it happen?", { "eyes": "worry", "mouth": "wavy" })
	s.face(T, 0.2, 1.6, 36)
	await s.say("thorne", "Some go slow. Some take three days. One took a week, but he'd a cold.", { "eyes": "soft", "mouth": "smile" })
	# the sweepstake
	music("wits")
	C.hold("R", form("cassian"), GRIP)
	O.hold("R", form("odile"), GRIP)
	raise("cassian")
	C.look = R
	O.look = C
	s.cut(Vector3(-29.6, 1.55, -5.7), Vector3(-26.9, 1.28, -4.7), 42)
	await s.say("cassian", "All four hundred. At once. One almost admires the unanimity.", { "eyes": "half", "mouth": "smirk" })
	await s.say("odile", "Poor thing. How long would you give him?", { "eyes": "soft", "mouth": "smile" })
	s.main.sfx("chalk")
	lower("cassian")
	await s.say("cassian", "A copper a guess. \"Days until the farm goes home.\" Do put me down for fourteen.", { "eyes": "happy", "mouth": "grin" })
	await s.fade(1.0, 1.0)
	disarm(FIRST + ["cassian", "odile"])
	a._free_people()


# ============================================================ free afternoons == --
## Where everyone's to be found, and what a first and a second time with them is.
func _who() -> Dictionary:
	return {
		"wim": [Vector3(-13.4, FY[0], -7.0), PI, "stand", "the ground floor corridor, west"],
		"bet": [Vector3(18.0, FY[0], -11.2), PI * 0.5, "stand", "the Refectory, by the counter"],
		"kas": [Vector3(31.4, 0, -5.6), -PI / 2, "stand", "the Glasshouse"],
		"isolde": [Vector3(14.4, FY[1], -15.4), -PI / 2, "read", "the Library, first floor, among the shelves"],
		"dorn": [Vector3(1.9, 0, 30.8), -2.4, "stand", "the founder's statue"],
		"maron": [Vector3(-11.8, 0, 7.4), 0.6, "ground", "the blossom tree"],
		"tobin": [Vector3(-31.6, 0, -12.4), -PI / 2, "stand", "the practice yard"],
		"lucan": [Vector3(4.53, 0, 9.47), -PI * 0.25, "bench", "a bench by the fountain"],
		"sibyl": [Vector3(16.0, FY[1], -11.9), PI, "table", "the Library, first floor, at the long table"],
		"vane": [Vector3(2.6, FY[0], -12.4), -PI / 2, "stand", "the Great Hall, with a ball of string"],
		"glimmer": [Vector3(-27.0, 0, -22.0), 0.0, "light", "something on the path by the pond"],
	}


func hint(w: String) -> String:
	if not free_on.has(w): return ""
	return "◆  " + String(_who()[w][3])


func _free(k: int, h: float, names: Array, n: int, place: String) -> void:
	s.go_place("academy")
	s.campus.chapter = 2
	music("school")
	s.main.sound.air("school")
	a.ch1.levelled = true
	var R := reiner(0.6, -3.2, 0.0)
	s.campus.open(h)
	a.ch1.board(25, true)
	s.busy = true
	s.hour_run = 0.3 / s.campus.HOUR_SECS
	slots = n if s.main.dev_pick < 9 else 40              # (dev: --pick=9 sees everyone)
	free_on = {}
	var all := _who()
	for w in names:
		if w != "glimmer":
			if knows(w) < 0: continue
			var seen1: bool = a.flag.has(w + "1")
			var seen2: bool = a.flag.has(w + "2")
			if seen2 or (seen1 and not SECOND.has(w)): continue
		elif a.flag.has("glimmer"): continue
		var q: Array = all[w]
		clear(q[0].x, q[0].z, 1.7)
		var f := { "p": q[0], "top": 2.05, "who": w }
		if w != "glimmer":
			take([w])
			var p := at(w, q[0].x, q[0].z, q[1], q[0].y)
			match q[2]:
				"read":
					p.pose = "read"
					p.hold("L", s.prop("book_open"), Transform3D(Basis(Vector3.RIGHT, 0.5) * Basis(Vector3.UP, PI), Vector3(-0.1, -0.02, 0.08)))
				"ground":
					p.pose = "groundread"
					f.top = 1.35
				"bench":
					p.sit(0.5, "sit")
					f.top = 1.65
				"table":
					p.sit(0.46, "desk")
					f.top = 1.65
		f.m = _diamond(Color("ffd87a") if w != "maron" and w != "glimmer" else Color("ff9ad0"))
		free_on[w] = f
		var u := { "pos": q[0], "r": 1.7, "label": ("Spend time with " + String(s.NAMES[w])) if w != "glimmer" else "Look closer", "first": true }
		u.f = func() -> void: _spend(w)
		f.u = u
		s.uses.append(u)
	s.uses.append({ "pos": Vector3(-28.2, 0, 21), "r": 1.6, "label": "Call it a day", "first": true, "f": func(): slots = 0 })
	s.play()
	await s.fade(0.0, 0.8)
	s.ui.place(place)
	s.ui.toast("The afternoon's yours. ◆ marks people to spend it with. J: who's where.")
	var id: int = a.run_id
	var auto_i := 0
	while slots > 0 and a.run_id == id:
		s.ui.objective("Free time.  Spend it with someone  (%d left)" % slots)
		if s.main.dev_auto and s.mode == "play" and not s.locked:
			await s.wait(0.6)
			if free_on.is_empty(): slots = 0
			else:
				var ks: Array = free_on.keys()
				var kk: String = ks[(auto_i + s.main.dev_pick * 3) % ks.size()]
				auto_i += 1
				R.place(free_on[kk].p + Vector3(0.9, 0, 0.9), 0.0)
				await _spend(kk)
		await s.beat()
	s.ui.objective("")
	await s.fade(1.0, 0.8)
	for w in free_on: if free_on[w].has("m") and is_instance_valid(free_on[w].m): free_on[w].m.queue_free()
	for w in names: if w != "glimmer": drop(act(w), "L")
	free_on = {}
	a._free_people()


func _diamond(c: Color) -> Node3D:
	var m := MeshInstance3D.new()
	var pm := SphereMesh.new()
	pm.radius = 0.09
	pm.height = 0.26
	pm.radial_segments = 4
	pm.rings = 1
	m.mesh = pm
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.albedo_color = c
	m.material_override = mat
	m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	s.add_child(m)
	sprites.append(m)
	return m


## Spend a slot of the afternoon with someone: their scene, then back to the afternoon.
func _spend(w: String) -> void:
	if s.locked or not free_on.has(w): return
	var f: Dictionary = free_on[w]
	s.locked = true
	s.uses.erase(f.u)
	if is_instance_valid(f.m): f.m.queue_free()
	free_on.erase(w)
	slots -= 1
	var R: Node3D = s.hero
	var back: Vector3 = R.position
	var run: float = s.hour_run
	s.film()
	s.hour_run = 0.0
	await s.fade(1.0, 0.35)
	if w == "glimmer": await _glimmer(f.p)
	else:
		var second: bool = a.flag.has(w + "1")
		var q: Array = _who()[w]
		var P := act(w)
		P.lod = 0
		var fw: Vector3 = Vector3(sin(P.yaw), 0, cos(P.yaw))
		var sit: bool = q[2] in ["bench", "table"]
		if q[2] in ["stand", "read"]: R.place(P.position + fw * 1.35, P.yaw + PI)
		elif q[2] == "ground":
			R.place(P.position + fw * 1.4, P.yaw + PI)
			R.pose = "ground"
			P.pose = "ground"
		elif q[2] == "bench":
			var al := Vector3(0.707, 0, 0.707)
			P.place(q[0] + al * 0.5, q[1])
			P.sit(0.5, "sit")
			R.place(q[0] - al * 0.5, q[1])
			R.sit(0.5, "sit")
		else:
			R.place(P.position + Vector3(0.95, 0, 0.0), PI)
			R.sit(0.46, "sit")
		drop(P, "L")
		if q[2] == "read": P.pose = "stand"
		P.look = R
		R.look = P
		P.feel("open", "flat")
		R.feel("open", "flat")
		music("evening")
		_pair(P, R, sit or q[2] == "ground")
		await s.fade(0.0, 0.35)
		await _scene(w, P, R, sit or q[2] == "ground", SECOND[w] if second else FIRSTS[w])
		a.flag[w + ("2" if second else "1")] = true
		await s.fade(1.0, 0.4)
		ups.erase(w)
		P.reach.R = null
		drop(P, "R")
		P.look = null
		R.stand()
		R.place(P.position + fw * 1.6 if q[2] in ["stand", "read"] else back, R.yaw)
		R.look = null
		if q[2] == "read": P.pose = "stand"
	music("school")
	s.hour_run = run
	s.play()
	s.locked = false
	await s.fade(0.0, 0.4)


func _pair(P: Node3D, R: Node3D, seated: bool) -> void:
	var side := -1.0 if P == act("isolde") or P == act("bet") else 1.0
	if seated:
		var m: Vector3 = (P.head_pos() + R.head_pos()) * 0.5
		var f: Vector3 = Vector3(sin(P.yaw), 0, cos(P.yaw))
		if P.position.distance_to(R.position) > 1.2: s.two(P, R, 1.0, 2.5, 40, 0.1)
		else: s.cut(m + f * 2.1 + Vector3(0, 0.15, 0), m - Vector3(0, 0.1, 0), 40)
	else: s.two(P, R, side, 2.5, 40, 0.1)


## Play a talk: [speaker ("R" is Reiner), words, eyes, mouth, gesture], or { ask: [[label, points, [lines]], ...] }.
func _scene(w: String, P: Node3D, R: Node3D, seated: bool, lines: Array) -> void:
	var i := 0
	var show := false
	for l in lines:
		if l is Dictionary:
			if l.has("ask"):
				_pair(P, R, seated)
				var items: Array = []
				for o in l.ask: items.append([str(items.size()), o[0]])
				var k: int = await s.ask(items)
				var o: Array = l.ask[k]
				a.flag["%s_%s" % [w, l.get("id", "c")]] = k
				await _scene(w, P, R, seated, o[2])
				a.gain(w, int(o[1]))
			elif l.has("do"): await (l.do as Callable).call(P, R)
			elif l.has("form"):
				show = l.form
				if l.form:
					if P.held.R == null: P.hold("R", form(w), GRIP)
					raise(w)
				else: lower(w)
			elif l.has("become"):
				P.hold("R", s.prop("wand_lucan"), GRIP)
				await become(w)
				show = true
			continue
		var who: String = "reiner_uni" if l[0] == "R" else (w if l[0] == "P" else l[0])
		var A: Node3D = act(who)
		if show and A == P:
			reveal(w, 0.25 if not seated or P.position.distance_to(R.position) > 1.2 else 0.4 * signf(wrapf(atan2(R.position.x - P.position.x, R.position.z - P.position.z) - P.yaw, -PI, PI)), 1.7)
			show = false
		elif i % 3 == 2: _pair(P, R, seated)
		elif seated and P.position.distance_to(R.position) < 1.2:                # side by side: from the front, a little toward the other
			var B: Node3D = P if A == R else R
			var off: float = wrapf(atan2(B.position.x - A.position.x, B.position.z - A.position.z) - A.yaw, -PI, PI)
			s.face(A, -0.52 * signf(off), 1.25, 40)
		else: s.face(A, 0.35 if A == R else -0.35, 1.35, 37)
		var o := { "eyes": l[2] if l.size() > 2 else "open", "mouth": l[3] if l.size() > 3 else "flat" }
		if l.size() > 4:
			o["do"] = l[4]
			o["d"] = 1.6
		await s.say(who, l[1], o)
		i += 1


var FIRSTS := {
	"wim": [["P", "It won't come out of my sleeve. It's been up there since Tuesday. It purrs, so I know it's alive.", "worry", "wavy"], ["R", "Does it do magic?", "open", "flat"], ["P", "It did a lovely bit this morning. I had my eyes shut.", "soft", "smile"], ["P", "Do you think I ought to make it? People say you've got to show them who's in charge.", "worry", "flat"],
		{ "ask": [["\"Let it hide. It'll come when it's bored.\"", 2, [["P", "That's... that's what nobody ever said to me.", "wide", "small"], { "form": true }, ["P", "It's put its nose out. Look. It heard you.", "happy", "grin"]]], ["\"You could be a bit firm with it.\"", 1, [["P", "I'll try. Excuse me, wand. Sorry. Never mind.", "worry", "wavy"], ["R", "Very firm.", "happy", "smile"]]]] },
		["P", "You'll get one, you know. I've decided to be sure about something for once, and it's that.", "soft", "smile"]],
	"bet": [["P", "Grab a cloth. If you stand still in here, Dorle thinks you're a plate.", "half", "grin"], ["R", "Is that your wand? In the washing up?", "wide", "flat"], { "form": true }, ["P", "It likes it. It did the whole of the stew pans last night, singing.", "happy", "smile"], ["P", "It's Mam's, you know. To the dent. It went down with the boat when I was six. I never told a soul I wanted it back.", "soft", "wavy"], { "form": false }, ["P", "You know what they call me in second year? Scullery. Like it's a name. I answer to it, too. Easier.", "half", "flat"],
		{ "ask": [["\"I'm not going to call you that.\"", 2, [["P", "No. You wouldn't, would you.", "soft", "smile"], ["P", "Here. Kitchen door key. The spare. It's the back way out and nobody ever asks. Don't say I never gave you anything.", "half", "smirk"], { "do": func(_p, _r): pass }]], ["\"They call me the Farm.\"", 2, [["P", "Scullery and the Farm. We sound like a pub.", "happy", "grin"], ["P", "Here. Spare key to the kitchen door. A pub ought to have a back way out.", "half", "smirk"]]]] },
		["P", "Now dry. Properly. My wand's watching.", "half", "smile"]],
	"kas": [["P", "Shh. It's deciding.", "soft", "small"], ["R", "Is that from the leaf?", "wide", "smile"], ["P", "It's a bellflower after all. It hasn't rung yet. They only ring for one thing, each of them. You don't know what till it does.", "soft", "flat"], ["P", "Wands are cuttings, you know. Every one's a bit of a tree that wanted to see what was round the corner.", "open", "smile"], ["R", "Then they all wanted to see what was round the corner from me.", "sad", "smile"],
		{ "ask": [["Hum it the morning song", 2, [["P", "That's the one your mother does, with the hens.", "soft", "smile"], ["P", "It's leaning. I'll keep it on the sill, your side. If it rings for you, you'll hear it.", "happy", "smile"]]], ["Just sit with it", 2, [["P", "You're the only one who doesn't ask it to hurry.", "soft", "smile"], ["P", "I'll keep it on the sill, your side of the court. In case.", "soft", "smile"]]]] }],
	"isolde": [["P", "You're here about the wands. Sit down. I have been reading.", "half", "flat"], ["R", "Is there something wrong with me?", "worry", "flat"], ["P", "That is not a research question.", "half", "flat"], ["P", "I watched the roll. I have drawn it. If they disliked you they'd scatter anyhow. They didn't. They rolled straight back from where you stood, and stopped, in a ring.", "open", "flat"], ["P", "That isn't running away, Reiner. People do it in a street, for a carriage. They were making room.", "lookL", "flat"], ["R", "For what?", "wide", "small"],
		{ "ask": [["\"Would you keep looking?\"", 2, [["P", "I was going to whether you asked or not. ...I am glad you asked.", "soft", "smile"]]], ["\"Maybe they're just being polite.\"", 1, [{ "form": true }, ["P", "Wands are not polite. I have one. It corrects my spelling.", "half", "flat"]]]] }],
	"dorn": [["P", "How do you hold a small thing?", "half", "flat"], ["R", "What sort of small thing?", "open", "flat"], ["P", "Any. Kas gave me a seedling to mind. I've been carrying it in two hands since breakfast. I need to eat.", "worry", "wavy"],
		{ "ask": [["\"You don't hold it. You let it sit.\"", 2, [["P", "Let it sit.", "open", "flat"], ["P", "...Huh. It's sat.", "wide", "smile"]]], ["\"I'll mind it while you eat.\"", 2, [["P", "You'd do that.", "wide", "flat"], ["P", "After I stood on the other one.", "down", "flat"], ["R", "You got it a bigger pot.", "soft", "smile"]]]] },
		["P", "Roe came round. Wanted me to hold a door shut on you for a laugh. I said no. It's a good word. You were right about it.", "half", "flat"]],
	"maron": [["P", "No lesson today. I can't teach sticks.", "half", "flat"], ["R", "Yours came straight away.", "open", "flat"], ["P", "Mine was told to. Sit down. Look. Three cups, one bean.", "half", "smirk"], { "do": func(p, r): await _cups(p, r) }, ["P", "Where's the bean?", "half", "smile"], ["R", "That one. I watched it.", "open", "smile"], ["P", "So did I. It's behind your ear.", "soft", "smile"], ["R", "How do you DO that?", "wide", "oh"],
		{ "ask": [["\"Show me again. Slower.\"", 1, [["P", "Slower only makes you look harder at the wrong cup.", "half", "smile"]]], ["\"So it's never where I'm looking?\"", 2, [["P", "...No. It isn't.", "wide", "small"], ["P", "The thing you want is never under the cup they've put in front of you. Remember that, when you're in that yard.", "soft", "flat"]]]] },
		["P", "Reiner. They're only sticks. Don't let them tell you what you are.", "open", "flat"]],
	"tobin": [["P", "I'm sorry. ...No. I am sorry. ...No. Sorry is what I am.", "worry", "flat"], ["R", "Who are you talking to?", "open", "flat"], ["P", "The target. I was practising. It was going to be you, after.", "wide", "wavy"], ["P", "I told them about you, because they said I was somebody. And then I was somebody, and it was only me.", "down", "frown"],
		{ "ask": [["\"I know. It's all right, Tobin.\"", 2, [["P", "Is it? Just like that?", "wide", "small"], ["R", "You've already said it to the target.", "soft", "smile"], { "form": true }, ["P", "If anybody tries anything with you. I'd hear. People tell me things. I'd tell you, this time.", "stern", "flat"]]], ["\"I'm not ready yet. But keep practising.\"", 1, [["P", "That's fair. That's better than fair.", "soft", "flat"]]]] }],
	"lucan": [["P", "You may sit. There's no Table. I keep forgetting to be sorry about it.", "soft", "smile"], ["R", "Is that yours?", "open", "flat"], { "do": func(p, _r): _show_old(p) }, ["P", "My wand. Whitethorn and silver. My grandfather's, then my father's. It was put in my hand in a velvet box. It's never turned into anything, for any of us.", "half", "flat"], ["P", "It works perfectly. I should have given anything, once, for a stick off the ground that hopped.", "sad", "flat"],
		{ "ask": [["\"Have you ever asked it?\"", 2, [["P", "Asked it.", "wide", "small"], ["P", "No. One doesn't. One's told it's yours.", "sad", "flat"], ["P", "...I believe I'll try. When nobody's about. Don't tell Dorn; he'd want to hum.", "soft", "smile"]]], ["\"At least you've got one.\"", 1, [["P", "Quite so. It's a poor hour for me to be complaining to you.", "soft", "smile"]]]] },
		["P", "Roe is a mimic. They're only dangerous if you stop talking. Don't stop.", "half", "flat"]],
	"sibyl": [["P", "Don't hover. Sit. I'm writing a ledger.", "half", "flat"], ["R", "Another one?", "worry", "flat"], ["P", "A different one. The last was everything people owed. Somebody pinned it to the walls, and I read it, for the first time, as if I hadn't written it.", "down", "flat"], ["P", "This one is what people did that they needn't have. It's harder. Nobody reports it.", "open", "flat"], ["P", "I require an entry. Something somebody did.", "half", "flat"],
		{ "ask": [["\"Wim made my bed, before he'd met me.\"", 2, [["P", "\"Wim. One bed. Unasked.\" ...Thank you. That's rather a good one.", "soft", "smile"]]], ["\"You told me you'd got the volumes wrong on purpose.\"", 2, [["P", "That was not a kindness.", "wide", "flat"], ["R", "You didn't have to tell me.", "soft", "smile"], ["P", "...Noted.", "lookL", "smile"]]]] },
		{ "form": true }, ["P", "If anyone takes anything of yours, tell me what hour. I'm very good at hours.", "half", "flat"]],
	"vane": [["P", "You. Hold this string.", "half", "flat"], ["R", "What's it for?", "open", "flat"], ["P", "Evidence. Cards found on eleven nights. I've strung where each one lay. From above, it makes a shape.", "half", "flat"], ["R", "It looks like a rabbit.", "wide", "smile"], ["P", "...It does look like a rabbit.", "shut", "flat"],
		{ "ask": [["\"Perhaps they're only having fun.\"", 1, [["P", "Nobody has fun every night for a month, boy. Not alone. I know the look of someone who can't sleep.", "half", "flat"]]], ["\"You could ask them, instead of chasing them.\"", 2, [["P", "Ask. The thief.", "wide", "flat"], ["P", "Thirty years, and I have never once tried it.", "half", "flat"], ["P", "Hm. Go along. ...Mind how you go, at night. The roofs are slippery. So I'm told.", "half", "smile"]]]] }],
}
var SECOND := {
	"wim": [["P", "I wrote to your sister. I hope you don't mind. I said you were the bravest person I'd met who was also kind, and that Duchess was well.", "worry", "smile"], ["R", "What did Lotte say?", "wide", "smile"], ["P", "She said, \"I know.\"", "happy", "grin"], ["P", "If you go home, I'd have to have a new bed across from mine. I don't think I could make it properly.", "sad", "wavy"],
		{ "ask": [["\"I'm not going anywhere.\"", 2, [["P", "You can't promise that. But thank you for saying it as if you could.", "soft", "smile"]]], ["\"If I did, you'd still be brave.\"", 2, [["P", "Only early in the morning.", "soft", "wavy"], ["P", "...But yes. I think I would. That's your fault.", "soft", "smile"]]]] }],
	"bet": [["P", "Give us your wrist. I said I'd show you. It's a Sarrow knot. It holds in any weather. But it slips if the one wearing it tells a lie.", "half", "grin"], ["R", "That's not real.", "half", "smile"], ["P", "How are you getting on with all this?", "open", "flat"], ["R", "I'm fine.", "lookL", "flat"], { "do": func(_p, _r): pass }, ["P", "...It's on the floor, Reiner.", "soft", "flat"],
		{ "ask": [["\"I'm frightened there's nothing for me.\"", 2, [["P", "There. That holds, see? Try and shake it off.", "soft", "smile"], ["P", "I came off a boat with a bucket. Something'll have you. It's only slow.", "soft", "smile"]]], ["\"It was a loose knot.\"", 1, [["P", "That's slipped another one. I'll get you some string.", "happy", "smirk"]]]] }],
	"isolde": [["P", "Hold out your hand. I wish to try something with mine. It has never bowed to anyone. It won't bow to Halden.", "half", "flat"], { "do": func(p, r): await _bow_wand(p, r) }, ["P", "...It bowed.", "wide", "small"], ["R", "Is that good?", "worry", "flat"], ["P", "I am extremely annoyed.", "wide", "flat"],
		{ "ask": [["\"You don't sound annoyed.\"", 2, [["P", "I sound like someone who is going to be up all night. It's the best thing that's happened all term.", "happy", "smile"]]], ["\"Perhaps it was tired.\"", 1, [["P", "Wands do not tire. They sulk.", "half", "flat"]]]] }],
	"tobin": [["P", "There's a book on you. Roe's running it. How many days till you go home. I put a copper on it, to see the list.", "worry", "flat"], ["R", "What did you put?", "sad", "flat"], ["P", "\"Never.\" He wouldn't write it down. Said it wasn't a number.", "stern", "flat"],
		{ "ask": [["\"Thank you, Tobin.\"", 2, [["P", "And he's planning something with spoons. I don't know what. I'll find out. I'm quite good at being overlooked, it turns out.", "half", "smile"]]], ["\"Don't get yourself in trouble.\"", 2, [["P", "I'd like to be in the right sort, for once. He's planning something with spoons.", "soft", "smile"]]]] }],
	"lucan": [["P", "I asked it.", "soft", "small"], ["R", "Your wand? What happened?", "wide", "smile"], ["P", "Nothing, for an hour. Then it turned over, like something asleep that's had its name said. And then... watch.", "soft", "smile"], { "become": true }, ["R", "It's a night-light.", "wide", "smile"], ["P", "I was afraid of the dark till I was quite old. One wasn't to mention it. I never have.", "soft", "flat"], { "form": false }, ["P", "I'm nineteen in the spring. I've never been so pleased about so little. How do you bear it?", "happy", "smile"],
		{ "ask": [["\"You get a rhythm.\"", 2, [["P", "Ha. I walked into that.", "happy", "smile"], ["P", "Whatever happens in that yard: I'll be standing next to you. I shan't say anything clever.", "soft", "flat"]]], ["\"I don't, always.\"", 2, [["P", "No. I've watched you not. It's the bravest thing in the building.", "soft", "flat"], ["P", "I'll be in the yard, for the last of it. I'll stand where you can see me.", "soft", "flat"]]]] }],
	"maron": [["P", "If you could be somebody nobody'd ever met. Only at night. Nobody's daughter, nobody's pupil. Would you?", "half", "flat"], ["R", "Doing what?", "open", "flat"], ["P", "Whatever you liked. Being looked at. Not being seen.", "down", "flat"],
		{ "ask": [["\"I'd get lonely.\"", 2, [["P", "...Yes. I expect one would. After a while.", "sad", "small"], ["P", "I know somebody like that. She says it's the best fun in the world. She says it a good deal.", "down", "smile"], ["R", "Tell her she can come to supper.", "soft", "smile"], ["P", "I'll tell her.", "wide", "small"]]], ["\"I'd wonder who was minding me.\"", 2, [["P", "Nobody. That's rather the point.", "half", "flat"], ["R", "Then I'd worry about her.", "soft", "flat"], ["P", "...You would, too. You don't even know her.", "wide", "small"]]]] }],
}


func _bow_wand(P: Node3D, R: Node3D) -> void:
	R.do("offer", 4.0)
	P.hold("R", form("isolde"), GRIP)
	raise("isolde")
	s.two(P, R, -1.0, 2.0, 38, 0.0)
	await s.wait(0.6)
	s.main.sfx("chirp")
	var t0: float = s.time
	while s.time < t0 + 2.0:
		ups.isolde = 0.15 + sin(clampf((s.time - t0) / 2.0, 0.0, 1.0) * PI) * 1.0
		await s.beat()
	lower("isolde")


## Three cups on the grass, going round each other.
func _cups(P: Node3D, R: Node3D) -> void:
	var m: Vector3 = P.position.lerp(R.position, 0.5)
	var sd: Vector3 = (R.position - P.position).normalized().rotated(Vector3.UP, PI / 2)
	var cs: Array = []
	for k in 3:
		var c: Node3D = a.keep(s.put("cup", m + sd * (k - 1) * 0.22, 0.0, 1.2))
		c.rotation.x = PI
		c.position.y = 0.13
		cs.append(c)
	P.look = m
	R.look = m
	s.cut(m + sd * 0.2 + Vector3(0, 1.5, 0) + (P.position - R.position).normalized() * -1.1, m + Vector3(0, 0.1, 0), 44)
	P.reach.R = m + Vector3(0, 0.2, 0) + sd * -0.1
	P.reach.L = m + Vector3(0, 0.2, 0) + sd * 0.1
	var ix: Array = [0, 1, 2]
	for q in [[0, 1], [1, 2], [0, 2], [0, 1], [1, 2]]:
		var t0: float = s.time
		var ca: Node3D = cs[ix[q[0]]]
		var cb: Node3D = cs[ix[q[1]]]
		var pa: Vector3 = ca.position
		var pb: Vector3 = cb.position
		var fw: Vector3 = (R.position - P.position).normalized() * 0.16
		s.main.sfx("clack", null, -14.0)
		while s.time < t0 + 0.34:
			var u: float = smoothstep(0.0, 1.0, (s.time - t0) / 0.34)
			ca.position = pa.lerp(pb, u) + fw * sin(u * PI)
			cb.position = pb.lerp(pa, u) - fw * sin(u * PI)
			P.reach.R = ca.position + Vector3(0, 0.1, 0)
			P.reach.L = cb.position + Vector3(0, 0.1, 0)
			await s.beat()
		ca.position = pb
		cb.position = pa
		var sw = ix[q[0]]
		ix[q[0]] = ix[q[1]]
		ix[q[1]] = sw
	P.reach = { "L": null, "R": null }
	P.look = R
	R.look = P


func _show_old(P: Node3D) -> void:
	P.hold("R", s.prop("wand_lucan"), GRIP)
	raise("lucan")


## Something on the path by the pond.
func _glimmer(p: Vector3) -> void:
	var R: Node3D = s.hero
	R.place(p + Vector3(-1.0, 0, 0.8), 2.25)
	R.feel("wide", "flat")
	music("night")
	s.cut(p + Vector3(1.5, 1.2, 2.6), p + Vector3(-0.45, 0.85, 0.3), 46)
	await s.fade(0.0, 0.4)
	for k in 4:
		shape(p + Vector3(randf_range(-0.2, 0.2), 0.2 + k * 0.25, 0), Vector3(0, 0.25, 0), 3.0, 0.8)
		s.main.sfx("chime", null, -14.0)
		await s.wait(0.4)
	R.look = p + Vector3(0, 1.2, 0)
	await s.say("reiner_uni", "It's a heart. It's a heart made of... nothing.", { "eyes": "wide", "mouth": "oh" })
	s.cut(p + Vector3(-3.0, 1.3, 0.4), p + Vector3(3.4, 4.4, 2.8), 56)
	for k in 5:
		shape(p + Vector3(0.4 + k * 1.2, 1.2 + k * 1.5, 1.0 + k * 0.9), Vector3(0.1, 0.1, 0), 2.6, 1.0)
		await s.wait(0.3)
	await s.say("reiner_uni", "They go up. They go up the wall, and onto the roof.", { "eyes": "wide", "mouth": "flat" })
	s.face(R, 0.3, 1.4, 36)
	await s.wait(0.6)
	await s.say("reiner_uni", "...It smells of honey buns.", { "eyes": "worry", "mouth": "flat" })
	a.flag.glimmer = true
	await s.fade(1.0, 0.4)
	R.look = null


func d3_free() -> void: await _free(0, 16.4, ["wim", "bet", "kas", "isolde", "dorn", "maron"], 2, "Two days without a wand")
func d5_free() -> void: await _free(1, 16.4, ["tobin", "lucan", "sibyl", "vane", "maron", "wim", "bet", "glimmer"], 2, "Five days without a wand")
func d7_free() -> void: await _free(2, 16.4, ["wim", "bet", "kas", "isolde", "dorn", "tobin", "lucan", "sibyl", "vane", "maron", "glimmer"], 2, "Eight days without a wand")
func d9_free() -> void: await _free(3, 16.4, ["wim", "bet", "kas", "isolde", "dorn", "tobin", "lucan", "sibyl", "vane", "maron", "glimmer"], 2, "Eleven days without a wand")


# ==================================================================== 4 == --
## The garden of wands: they stand in the grass and look about. Move while one's looking, and off it hops.
func _garden_update(dt: float) -> void:
	if garden.is_empty(): return
	var R: Node3D = s.hero
	if R == null: return
	for g in garden:
		if g.get("gone", false) or not is_instance_valid(g.n): continue
		g.t += dt
		var n: Node3D = g.n
		if g.get("hop", 0.0) > 0.0:
			g.hop -= dt
			g.p += g.v * dt
			var u: float = fmod(g.hop * 3.2, 1.0)
			n.position = g.p + Vector3(0, 0.12 + sin(u * PI) * 0.32, 0)
			n.rotation = Vector3(-PI / 2 + sin(g.hop * 9.0) * 0.3, atan2(g.v.x, g.v.z), 0)
			if g.hop <= 0.0:
				n.position = g.p + Vector3(0, 0.12, 0)
				g.look = 1.5
			continue
		# a glance this way, then back to the grass
		g.look = float(g.get("look", 0.0)) - dt
		if g.look < -g.rest: g.look = 1.3 + randf() * 0.8
		var looking: bool = g.look > 0.0
		var d: Vector3 = R.position - g.p
		d.y = 0.0
		var l := d.length()
		var lean_ := 0.35 if looking else -0.25
		n.rotation = n.rotation.lerp(Vector3(-PI / 2 + lean_, atan2(d.x, d.z), 0), 1.0 - exp(-6.0 * dt))
		(g.lamp as MeshInstance3D).material_override.albedo_color = Color("ff6a5a") if looking else Color("8ad8ff")
		(g.lamp as MeshInstance3D).position = n.position + Vector3(0, 0.72 + sin(g.t * 3.0) * 0.04, 0)
		if s.mode != "play" or s.locked: continue
		if (looking and l < 4.2 and R.speed > 0.35) or (l < 3.4 and R.speed > 2.4):
			s.main.sfx("chirp")
			var away := (-d.normalized()).rotated(Vector3.UP, randf_range(-0.6, 0.6))
			var to: Vector3 = g.p + away * 2.6
			to.x = clampf(to.x, -21.5, -6.5)
			to.z = clampf(to.z, 25.6, 38.0)
			for c in [Vector3(-17, 0, 30), Vector3(-17, 0, 24), Vector3(-8.5, 0, 34)]:
				if to.distance_to(c) < 1.6: to = c + (to - c).normalized() * 1.6
			g.v = (to - g.p) / 1.1
			g.hop = 1.1


func d4_garden() -> void:
	open(13.2)
	music("sneak")
	take(["thorne", "wim", "selma", "cassian", "odile"])
	clear(-14, 31, 12)
	s.film()
	var T := at("thorne", -5.6, 30.0, -0.785)
	var R := reiner(-6.8, 31.2, 2.36)
	var W := at("wim", -5.0, 32.4, -PI / 2)
	var spots: Array = [[-10, 27.4], [-12.4, 31], [-11.4, 35.4], [-14.4, 27.6], [-14.2, 33.4], [-14.4, 37], [-19.8, 28.4], [-20.2, 35.4]]
	for i in spots.size():
		var n: Node3D = a.keep(s.put(KINDS[i % KINDS.size()], Vector3(spots[i][0], 0.12, spots[i][1]), 0.0, 1.35))
		n.rotation.x = -PI / 2
		var lm := _diamond(Color("8ad8ff")) as MeshInstance3D
		garden.append({ "n": n, "p": Vector3(spots[i][0], 0, spots[i][1]), "t": randf() * 4.0, "v": Vector3.ZERO, "look": -randf() * 2.0, "rest": 1.8 + randf() * 1.6, "lamp": lm })
	R.look = T
	s.move(Vector3(-11.6, 0.45, 32.4), Vector3(-13.2, 0.3, 30.2), Vector3(-10.6, 1.5, 34.6), Vector3(-9.6, 0.9, 30.4), 4.6, 48)
	await s.fade(0.0, 0.8)
	s.ui.place("The fourth day")
	await s.say("thorne", "Tipping them out's a shock to the shy ones. So I've planted them. Walk among them. Let them get used to you.", { "eyes": "soft", "mouth": "smile" })
	s.face(T, 0.2, 1.6, 36)
	await s.say("thorne", "They look about. When the tip's red, it's watching: be a tree. When it's blue, come on. And no running. You'd not run at a deer.", { "eyes": "open", "mouth": "smile", "do": "pointup" })
	s.face(R, -0.3, 1.4, 36)
	await s.say("reiner_uni", "I've done hens. It's the same, I think.", { "eyes": "soft", "mouth": "smile" })
	s.play()
	R.face_yaw = null
	s.ui.objective("Come up to three of the standing wands.  Stand still while they're red")
	var done := 0
	var id: int = a.run_id
	var reacts: Array = ["bite", "dead", "cry"]
	while done < 3 and a.run_id == id:
		for g in garden:
			if g.get("gone", false) or g.get("met", false): continue
			if s.main.dev_auto and s.mode == "play" and not s.locked:
				await s.wait(0.8)
				R.place(g.p + Vector3(0.5, 0, 0.5), R.yaw)
			if Vector2(R.position.x - g.p.x, R.position.z - g.p.z).length() < 1.0 and s.mode == "play" and not s.locked and g.get("hop", 0.0) <= 0.0:
				g.met = true
				await _garden_meet(g, reacts[done])
				done += 1
				if done < 3: s.ui.objective("Come up to %d more.  Stand still while they're red" % (3 - done))
				break
		await s.beat()
	s.film()
	R.place(Vector3(-11, 0, 31), PI / 2)
	T.place(Vector3(-9.4, 0, 31), -PI / 2)
	W.place(Vector3(-9.0, 0, 32.2), -PI / 2)
	R.look = T
	T.look = R
	s.two(R, T, -1.0, 3.1, 40, 0.1)
	await s.say("thorne", "You were lovely with them. Lovely. I've never seen anyone stand so still.", { "eyes": "soft", "mouth": "smile" })
	await s.say("reiner_uni", "It cried.", { "eyes": "sad", "mouth": "frown" })
	s.face(T, 0.2, 1.5, 34)
	await s.say("thorne", "It did. ...I don't know why it did that. I'd tell you if I knew. I keep thinking it was sorry.", { "eyes": "worry", "mouth": "flat" })
	s.cut(Vector3(-7.5, 1.45, 25.7), Vector3(-4.9, 1.24, 27.2), 44)
	var C := at("cassian", -5.4, 27.4, -PI * 0.7)
	var O := at("odile", -4.4, 27.0, -PI * 0.7)
	C.look = R
	await s.say("cassian", "\"I've done hens.\" Oh, that's going straight in.", { "eyes": "happy", "mouth": "grin" })
	O.look = R
	await s.say("odile", "Nine to go, Reiner! I've got you down for nine!", { "eyes": "happy", "mouth": "smile", "do": "wave" })
	s.face(R, -0.2, 1.4, 36)
	R.feel("down", "frown")
	await s.wait(1.6)
	await s.fade(1.0, 0.9)
	a._free_people()


func _garden_meet(g: Dictionary, kind: String) -> void:
	s.film()
	var R: Node3D = s.hero
	R.turn_to(g.p)
	var sd: Vector3 = (g.p - R.position).normalized().rotated(Vector3.UP, PI / 2)
	R.pose = "kneel"
	s.cut((g.p + R.position) * 0.5 + sd * 2.1 + Vector3(0, 0.8, 0), (g.p + R.position) * 0.5 + Vector3(0, 0.6, 0), 46)
	R.speed = 0.0
	R.feel("soft", "smile")
	R.do("offer", 2.4)
	g.look = -0.5
	g.rest = 60.0
	await s.wait(1.0)
	var n: Node3D = g.n
	match kind:
		"bite":
			s.main.sfx("bite")
			s.burst(R.hand_pos("R"), Color("fff2b0"), Color("ffc04a"), 12, 1.4, -2.0, 0.025, 0.5)
			R.do("flinch", 1.0)
			R.feel("squeeze", "shout", 1.2)
			g.v = (g.p - R.position).normalized() * 2.2
			g.hop = 1.4
			await s.say("reiner_uni", "Ow. ...That's fair. I'd my hand in its face.", { "eyes": "half", "mouth": "wavy", "auto": true })
		"dead":
			s.main.sfx("clack")
			var t0: float = s.time
			while s.time < t0 + 0.5:
				n.rotation.x = lerpf(-PI / 2, 0.0, (s.time - t0) / 0.5)
				await s.beat()
			g.gone = true
			n.position.y = 0.04
			(g.lamp as Node3D).visible = false
			R.feel("wide", "flat")
			await s.say("reiner_uni", "It's playing dead. ...It's quite good at it.", { "eyes": "worry", "mouth": "flat", "auto": true })
		"cry":
			s.main.sfx("chirp")
			for k in 6:
				n.rotation.x = -PI / 2 + sin(k * 2.0) * 0.18
				s.burst(n.position + Vector3(0, 0.3, 0), Color("8ad8ff"), Color("c8ecff"), 4, 0.6, -5.0, 0.02, 0.6)
				s.main.sfx("chirp", null, -8.0)
				await s.wait(0.22)
			R.feel("sad", "wavy")
			await s.say("reiner_uni", "Oh, no. No, don't. You don't have to. I'll go. I'm going.", { "eyes": "sad", "mouth": "wavy", "auto": true })
	R.pose = "stand"
	s.play()


# ==================================================================== 6 == --
func _dinner(look_at = null) -> Array:
	var seats: Array = [["reiner_uni", 11.3, -11.7, PI], ["wim", 12.25, -11.7, PI], ["bet", 13.2, -11.7, PI], ["maron", 14.15, -11.7, PI], ["otto", 15.1, -11.7, PI], ["nadi", 11.3, -13.1, 0.0], ["petra", 12.25, -13.1, 0.0], ["kas", 13.2, -13.1, 0.0], ["tobin", 14.15, -13.1, 0.0], ["isolde", 15.1, -13.1, 0.0],
		["ilse", 11.3, -15.9, 0.0], ["rowan", 12.25, -15.9, 0.0], ["joss", 13.2, -15.9, 0.0], ["marta", 14.15, -15.9, 0.0], ["yve", 15.1, -15.9, 0.0], ["fenn", 11.3, -14.5, PI], ["bram", 12.25, -14.5, PI], ["lucan", 13.2, -14.5, PI], ["dorn", 14.15, -14.5, PI], ["sibyl", 15.1, -14.5, PI]]
	take(PUP + ["cassian", "odile", "lucan", "dorn", "sibyl"])
	for n in PUP: act(n).visible = false
	clear(13, -14, 8)
	reiner(11.3, -11.7, PI, FY[0])
	for d in seats:
		var p: Node3D = act(d[0]) if d[0] == "reiner_uni" else at(d[0], d[1], d[2], d[3], FY[0])
		p.sit(0.46, "sit")
		p.lod = 0 if float(d[2]) > -13.4 else 1
		p.look = look_at
	return seats


## Whoever of these Reiner knows best, if he knows any of them well.
func best_of(l: Array, n := 2) -> String:
	var b := ""
	for w in l: if knows(w) >= n and (b == "" or knows(w) > knows(b)): b = w
	return b


func d6_spoons() -> void:
	open(12.3)
	s.film()
	music("wits")
	s.main.sound.air("room")
	var seats := _dinner()
	var R: Node3D = s.hero
	var C := at("cassian", 9.9, -12.0, PI / 2, FY[0])
	var O := at("odile", 8.6, -12.2, PI / 2, FY[0])
	s.move(Vector3(17.0, 2.1, -10.3), Vector3(12, 1.0, -12.8), Vector3(15.6, 1.8, -10.4), Vector3(11.6, 1.0, -12.2), 4.0, 52)
	await s.fade(0.0, 0.8)
	s.ui.place("The sixth day")
	await s.wait(1.2)
	for d in seats: act(d[0]).look = C
	s.two(C, R, 1.0, 2.1, 46, 0.1)
	await s.say("cassian", "Friends! A happy day. One has come forward.", { "eyes": "happy", "mouth": "grin", "do": "offer2", "d": 2.0 })
	R.look = C
	R.feel("wide", "flat")
	C.hold("R", s.prop("pouch"), Transform3D(Basis(), Vector3(0, -0.16, 0.06)))
	C.do("offer", 3.0)
	await s.say("cassian", "It was found wandering in the kitchens, calling for him. I couldn't keep them apart.", { "eyes": "soft", "mouth": "smile" })
	seat_face(R, 1.15, 40)
	await s.say("reiner_uni", "...Really?", { "eyes": "wide", "mouth": "small" })
	drop(C, "R")
	var sp: Node3D = s.prop("spoon")
	R.hold("R", sp, GRIP)
	R.reach.R = R.position + Vector3(0.06, 1.04, -0.42)
	s.cut(Vector3(11.0, FY[0] + 1.55, -12.8), R.position + Vector3(0.04, 0.98, -0.25), 42)
	s.main.sfx("clunk", null, -6.0)
	await s.wait(1.4)
	await s.say("cassian", "They turn into what you are, don't they? Underneath. And it has! Look!", { "eyes": "happy", "mouth": "grin" })
	s.main.sfx("laugh")
	for n in ["ilse", "rowan", "joss", "marta", "yve"]:
		act(n).feel("happy", "grin")
		act(n).do("laugh", 3.0)
		act(n).hold("R", s.prop("spoon"), GRIP)
	s.cut(Vector3(10.5, 1.55, -14.95), Vector3(13.4, 1.1, -15.9), 50)
	await s.wait(1.2)
	R.reach.R = null
	for n in ["ilse", "rowan", "joss", "marta"]:
		act(n).do("salute", 2.0)
		await s.wait(0.2)
	await s.wait(0.8)
	R.feel("down", "flat")
	seat_face(R, 1.1, 36)
	await s.wait(1.4)
	# who stands by him
	var who := best_of(["tobin", "wim", "dorn", "bet"])
	a.flag.spoons = who
	match who:
		"tobin":
			var T: Node3D = act("tobin")
			music("school")
			T.stand()
			await s.wait(0.5)
			s.face(T, 0.0, 1.3, 38)
			await s.say("tobin", "Twenty spoons. Signed out of the kitchen yesterday, by a Mister C. Roe. I've the slip. Dorle would like them washed.", { "eyes": "half", "mouth": "smirk" })
			s.face(C, 0.2, 1.4, 36)
			C.feel("wide", "flat")
			await s.wait(0.8)
			await s.say("tobin", "All of them. By hand. She was quite particular.", { "as": "Tobin" })
			s.main.sfx("laugh")
			for n in ["petra", "nadi", "otto", "kas", "bet"]:
				act(n).feel("happy", "grin")
				act(n).do("laugh", 2.0)
			await s.wait(1.6)
			seat_face(R, 1.1, 36)
			R.look = T
			R.feel("soft", "smile")
			await s.say("reiner_uni", "You found out about the spoons.", { "eyes": "soft", "mouth": "smile" })
			s.face(T, 0.0, 1.3, 36)
			await s.say("tobin", "I was practising.", { "eyes": "soft", "mouth": "smile" })
		"wim":
			var W: Node3D = act("wim")
			W.stand()
			W.turn_to(C)
			W.shiver = 1.0
			await s.wait(0.5)
			s.face(W, 0.0, 1.2, 38)
			await s.say("wim", "It isn't funny.", { "eyes": "worry", "mouth": "wavy" })
			s.main.sound.music("")
			s.face(C, 0.2, 1.4, 36)
			C.look = W
			await s.say("cassian", "I beg your pardon?", { "eyes": "half", "mouth": "smirk" })
			s.face(W, 0.0, 1.1, 34)
			await s.say("wim", "I said it isn't f-funny. I'm the most frightened person in this school and even I can see it isn't. You're only clever. He's kind. It's much harder.", { "eyes": "stern", "mouth": "shout" })
			for n in ["ilse", "rowan", "joss", "marta", "yve"]:
				act(n).feel("down", "flat")
				act(n).gest = ""
			s.cut(Vector3(16.6, 2.2, -11.0), Vector3(12.6, 1.0, -13.6), 50)
			await s.wait(1.8)
			W.shiver = 0.0
			seat_face(R, 1.1, 36)
			R.look = W
			R.feel("wide", "smile")
			await s.wait(1.2)
		"dorn":
			var D := at("dorn", 10.4, -10.75, -2.76, FY[0])
			s.main.sound.music("")
			D.look = C
			C.look = D
			D.turn_to(C)
			s.cut(Vector3(7.8, FY[0] + 1.75, -10.7), Vector3(10.15, FY[0] + 1.5, -11.3), 46)
			await s.say("dorn", "You're in the way.", { "eyes": "half", "mouth": "flat" })
			await s.say("cassian", "Of what?", { "eyes": "wide", "mouth": "smirk" })
			await s.say("dorn", "His dinner.", { "eyes": "half", "mouth": "flat" })
			C.feel("wide", "wavy")
			C.go_free([Vector3(8.9, FY[0], -11.2), Vector3(8.5, FY[0], -9.8), Vector3(8.5, FY[0], -7.8)], 1.8)
			await s.wait(1.2)
			D.look = R
			D.turn_to(R)
			s.cut(Vector3(12.0, FY[0] + 1.75, -13.6), Vector3(11.2, FY[0] + 1.36, -11.2), 46)
			R.look = null
			R.feel("soft", "smile")
			await s.say("dorn", "Eat. I'll sit. I'm letting you sit, too.", { "as": "Dorn" })
		"bet":
			var B: Node3D = act("bet")
			B.stand()
			B.turn_to(C)
			await s.wait(0.5)
			s.face(B, 0.0, 1.2, 38)
			await s.say("bet", "Them's my spoons.", { "eyes": "half", "mouth": "flat" })
			s.main.sfx("chirp")
			B.hold("R", form("bet"), GRIP)
			raise("bet")
			await s.say("bet", "And mine IS one. Turned into it, in front of everybody. So go on. Say it again about spoons.", { "eyes": "stern", "mouth": "flat" })
			await s.say("bet", "Every one of those, and I know them by name. And you'll have noticed who serves your soup.", { "eyes": "half", "mouth": "smirk" })
			s.main.sound.music("")
			s.cut(Vector3(10.5, 1.55, -14.95), Vector3(13.4, 1.1, -15.9), 50)
			for n in ["ilse", "rowan", "joss", "marta", "yve"]:
				act(n).feel("worry", "wavy")
				act(n).gest = ""
			await s.wait(1.8)
			s.face(C, 0.2, 1.4, 36)
			await s.say("cassian", "...It was only a joke.", { "eyes": "worry", "mouth": "wavy" })
			s.face(B, 0.0, 1.2, 36)
			await s.say("bet", "So's the soup.", { "eyes": "happy", "mouth": "grin" })
			lower("bet")
			drop(B, "R")
		_:
			await s.say("reiner_uni", "It's a good spoon.", { "eyes": "down", "mouth": "wavy" })
			R.stand()
			drop(R, "R")
			R.place(Vector3(11.3, FY[0], -10.7), 0.0)
			s.cut(Vector3(13.4, 1.6, -9.9), Vector3(10.4, 1.2, -10.8), 46)
			R.go_free([Vector3(10.6, FY[0], -10.75), Vector3(9.2, FY[0], -10.95), Vector3(8.5, FY[0], -9.8), Vector3(8.5, FY[0], -7.6)], 1.3)
			await s.wait(2.6)
	await s.fade(1.0, 0.8)
	for n in ["ilse", "rowan", "joss", "marta", "yve"]: drop(act(n), "R")
	drop(R, "R")
	# Odile, afterwards, kindly
	for d in seats: if d[0] != "reiner_uni": act(d[0]).visible = false
	C.visible = false
	music("low")
	R.stand()
	R.place(Vector3(12.4, FY[0], -6.9), PI)
	O.place(Vector3(13.8, FY[0], -7.6), -PI * 0.6)
	R.look = null
	R.feel("down", "flat")
	s.cut(Vector3(10.4, 1.5, -8.4), Vector3(13.0, 1.25, -7.2), 42)
	await s.fade(0.0, 0.8)
	O.look = R
	await s.say("odile", "He goes too far. I do tell him.", { "eyes": "soft", "mouth": "flat" })
	R.look = O
	s.face(O, 0.2, 1.3, 34)
	await s.say("odile", "You look so tired. There's no shame in it, you know. Some people aren't magic. Some people are lovely at hens.", { "eyes": "soft", "mouth": "smile" })
	O.hold("R", s.prop("page"), Transform3D(Basis(Vector3.RIGHT, -0.4), Vector3(0.04, -0.06, 0.1)))
	O.do("offer", 3.0)
	await s.say("odile", "I fetched you the form. For leaving. I filled in your name, to save you the bother.", { "eyes": "soft", "mouth": "smile" })
	s.face(R, -0.3, 1.3, 36)
	R.feel("sad", "flat")
	await s.wait(1.2)
	drop(O, "R")
	R.hold("R", s.prop("page"), Transform3D(Basis(Vector3.RIGHT, -0.4), Vector3(0.04, -0.06, 0.1)))
	await s.say("reiner_uni", "...Thank you.", { "eyes": "down", "mouth": "flat" })
	await s.say("odile", "You could just stop. Wouldn't that be nice?", { "eyes": "happy", "mouth": "smile" })
	await s.wait(0.6)
	await s.fade(1.0, 1.0)
	drop(R, "R")
	a._free_people()


# ==================================================================== 8 == --
func d8_duet() -> void:
	open(9.2)
	s.film()
	music("school")
	s.main.sound.air("room")
	take(FIRST + ["thorne", "cassian", "odile", "sibyl"])
	clear(-13, -14, 8)
	var D: Dictionary = s.stage.data.rooms["1A"]
	var S1 := { "isolde": 2, "tobin": 5, "wim": 9, "maron": 12, "petra": 17, "nadi": 18, "otto": 1, "selma": 21, "kas": 15, "bet": 13 }
	for n in S1:
		var q: Dictionary = D.seats[S1[n]]
		var p := at(n, q.x, q.z, q.yaw, FY[0])
		p.sit(0.46, "sit")
	armed(FIRST)
	var q0: Dictionary = D.seats[10]
	var R := reiner(q0.x, q0.z, q0.yaw, FY[0])
	R.sit(0.46, "sit")
	var T := at("thorne", -16.8, -14.8, PI / 2, FY[0])
	R.look = T
	s.move(Vector3(-7.4, 2.3, -17.4), Vector3(-16, 1.2, -14), Vector3(-8.6, 1.9, -16.4), Vector3(-16.6, 1.4, -14.6), 4.0, 46)
	await s.fade(0.0, 0.8)
	s.ui.place("The ninth day")
	await s.say("thorne", "Duets. You say half the word; your wand says the rest. It's manners. You leave it room.", { "eyes": "soft", "mouth": "smile" })
	var I: Node3D = act("isolde")
	seat_face(I, 1.3, 38)
	I.do("castdo", 1.0)
	await s.wait(0.5)
	shape_free(I.hand_pos("R") + Vector3(-0.4, 0.3, 0), Color("bff4ea"))
	s.main.sfx("rune")
	await s.wait(0.8)
	var P: Node3D = act("petra")
	seat_face(P, 1.3, 38)
	P.do("castdo", 1.0)
	await s.wait(0.5)
	s.burst(P.hand_pos("R") + Vector3(-0.3, 0.3, 0), Color("ff9ad0"), Color("ffd0ea"), 22, 1.8, -1.0, 0.035, 1.0)
	s.main.sfx("puff")
	P.feel("happy", "grin")
	await s.wait(0.8)
	T.hold("R", s.prop("wand_oak"), GRIP)
	s.face(T, 0.2, 1.6, 36)
	await s.say("thorne", "And for you, Reiner, the loan wand. Old Faithful. He's never turned into a thing. Couldn't bear to pick. He'll sing with anybody.", { "eyes": "happy", "mouth": "smile" })
	drop(T, "R")
	R.stand()
	R.position.x += 0.1
	R.hold("R", s.prop("wand_oak"), GRIP)
	R.feel("soft", "smile")
	R.pose = "cast"
	s.cut(Vector3(q0.x - 2.0, 1.6, q0.z + 0.7), Vector3(q0.x, FY[0] + 1.3, q0.z), 44)
	var r: float = await s.cast([["Sing", "U"], ["with", "L"], ["me", "R"], ["old", "D"], ["one", "U"], ["sing", "L"]], { "gap": 0.8, "wide": 0.28, "name": "A duet" })
	# what it really is
	R.do("castdo", 1.0)
	await s.wait(0.5)
	s.main.sfx("poof")
	s.burst(R.hand_pos("R"), Color("e8c890"), Color("c98a42"), 46, 2.6, -6.0, 0.035, 1.0)
	s.shake = 0.3
	drop(R, "R")
	R.do("flinch", 1.0)
	R.feel("wide", "oh")
	await s.wait(1.0)
	s.main.sfx("laugh")
	for n in ["petra", "nadi", "otto", "selma"]: act(n).feel("wide", "oh")
	s.face(T, 0.2, 1.5, 36)
	T.feel("wide", "oh")
	await s.say("thorne", "That's... that's bread. What've you done with Old Faithful?", { "eyes": "wide", "mouth": "oh" })
	s.face(R, 0.2, 1.3, 36)
	await s.say("reiner_uni", "I didn't do anything. You gave it to me.", { "eyes": "worry", "mouth": "wavy" })
	music("wits")
	s.stage.stand_open("1A")
	s.main.sfx("door")
	var C := at("cassian", -8.75, -10.6, PI * 1.2, FY[0])
	var O := at("odile", -7.9, -10.65, PI * 1.2, FY[0])
	C.look = R
	O.look = R
	s.cut(Vector3(-9.9, 1.6, -12.9), Vector3(-8.1, 1.25, -10.5), 44)
	await s.say("cassian", "He's broken the one that likes everybody. Oh, that's art.", { "eyes": "happy", "mouth": "grin" })
	O.feel("happy", "smile")
	O.do("giggle", 1.4)
	await s.wait(0.8)
	var who := best_of(["sibyl", "isolde", "kas"])
	a.flag.duet = who
	s.main.sound.music("")
	match who:
		"sibyl":
			C.place(Vector3(-8.0, FY[0], -11.2), PI * 1.2)
			O.place(Vector3(-7.0, FY[0], -11.4), PI * 1.2)
			var Si := at("sibyl", -9.3, -10.5, PI * 0.6, FY[0])
			Si.hold("L", s.prop("ledger"), Transform3D(Basis(Vector3.RIGHT, 1.2), Vector3(-0.1, -0.06, 0.12)))
			Si.look = C
			C.look = Si
			s.face(Si, 0.2, 1.4, 36)
			await s.say("sibyl", "Eight fifty-one this morning. Odile Fray, into this room. Eight fifty-three, out, with something long up her sleeve.", { "eyes": "half", "mouth": "flat" })
			s.face(O, 0.2, 1.3, 36)
			O.look = Si
			O.feel("wide", "small")
			await s.say("odile", "You can't possibly...", { "eyes": "wide", "mouth": "small" })
			s.face(Si, 0.2, 1.4, 34)
			await s.say("sibyl", "I'm very good at hours. The wand, please.", { "eyes": "half", "mouth": "smirk" })
			s.main.sfx("catch")
			await s.wait(0.6)
			s.face(T, 0.2, 1.5, 36)
			await s.say("thorne", "Out. Both of you. And Reiner: I'm sorry, my love. I ought to have looked.", { "eyes": "stern", "mouth": "flat" })
			drop(Si, "L")
		"isolde":
			I.stand()
			await s.wait(0.5)
			s.face(I, 0.0, 1.3, 38)
			await s.say("isolde", "It had a crust. Wands don't. Anyone who'd held one for ten seconds would know. So: someone who doesn't care for theirs.", { "eyes": "half", "mouth": "flat" })
			I.look = O
			s.face(O, 0.2, 1.3, 36)
			O.feel("wide", "small")
			await s.wait(1.0)
			s.face(I, 0.0, 1.2, 34)
			I.look = R
			await s.say("isolde", "Use mine, Reiner. It asked me to ask.", { "eyes": "soft", "mouth": "flat" })
			s.main.sfx("chirp")
			seat_face(R, 1.2, 36)
			R.feel("wide", "smile")
			await s.wait(1.0)
		"kas":
			var K: Node3D = act("kas")
			K.stand()
			await s.wait(0.5)
			s.face(K, 0.0, 1.3, 38)
			await s.say("kas", "Old Faithful's in the umbrella stand. He's crying. Can't you hear him?", { "eyes": "sad", "mouth": "flat" })
			await s.say("kas", "He says a girl with cold hands put him there.", { "eyes": "stern", "mouth": "flat" })
			s.face(O, 0.2, 1.3, 36)
			O.feel("wide", "small")
			await s.wait(1.2)
			s.face(T, 0.2, 1.5, 36)
			await s.say("thorne", "Cold hands. Yes. I'd noticed those. Out.", { "eyes": "stern", "mouth": "flat" })
		_:
			s.face(T, 0.2, 1.5, 36)
			await s.say("thorne", "...I'll have to write it down, love. He's two hundred years old.", { "eyes": "sad", "mouth": "flat" })
			s.face(R, 0.2, 1.3, 36)
			R.feel("sad", "frown")
			await s.wait(1.2)
			await s.fade(1.0, 0.5)
			# sweeping up with Thorne
			for n in FIRST + ["cassian", "odile"]: act(n).visible = false
			music("low")
			R.stand()
			R.place(Vector3(-17.0, FY[0], -13.1), PI)
			T.place(Vector3(-17.1, FY[0], -14.6), 0.0)
			a.keep(s.put("shavings", Vector3(-17.0, FY[0], -13.85), 0.4))
			R.look = T
			T.look = R
			s.cut(Vector3(-14.5, 1.75, -13.8), Vector3(-17.0, 1.32, -13.85), 46)
			await s.fade(0.0, 0.5)
			await s.say("thorne", "I was nineteen before mine came. I'd been told to stop holding my hand out. I put it in my pocket, and there it was.", { "eyes": "soft", "mouth": "smile" })
			await s.say("reiner_uni", "In your pocket?", { "eyes": "wide", "mouth": "flat" })
			await s.say("thorne", "I'd stopped looking where they'd told me to.", { "eyes": "soft", "mouth": "smile" })
			await s.wait(0.6)
	await s.fade(1.0, 0.9)
	s.stage.doors["1A"].erase("by_hand")
	disarm(FIRST)
	a._free_people()


func shape_free(p: Vector3, c: Color) -> void:
	s.burst(p, c, Color.WHITE, 26, 1.2, 0.3, 0.03, 1.2)
	shape(p, Vector3(0, 0.3, 0), 1.6, 0.8)


# =================================================================== 10 == --
func d10_last() -> void:
	open(18.6)
	s.film()
	music("low")
	var on: Array = ["cassian", "odile", "ilse", "rowan", "joss", "marta", "fenn", "yve"]
	take(FIRST + on + ["thorne", "lucan", "dorn", "corvin"])
	clear(-33, -8, 13)
	for i in FIRST.size():
		var an := lerpf(-2.0, 1.2, float(i) / (FIRST.size() - 1))
		at(FIRST[i], YARD.x + sin(an) * 4.3, YARD.z + cos(an) * 4.3, an + PI).look = YARD
	armed(FIRST)
	for i in on.size():
		var p := at(on[i], -27.4 + (i % 2) * 0.9, -9.4 + i * 0.95, -PI / 2)
		p.look = YARD
	var board: Node3D = a.keep(s.put("tally", Vector3(-26.0, 0.5, -10.6), -PI / 2))
	var R := reiner(YARD.x, YARD.z - 0.2, PI)
	var T := at("thorne", YARD.x + 1.1, YARD.z - 3.2, -0.3)
	var tb: Node3D = a.keep(s.put("tub", Vector3(YARD.x + 0.2, 0, YARD.z - 2.8)))
	T.look = R
	R.look = tb
	s.move(Vector3(-27.6, 4.0, -0.6), YARD + Vector3(0, 0.6, -0.6), Vector3(-30.0, 2.6, -3.6), YARD + Vector3(0, 0.6, -1.0), 5.0, 46)
	await s.fade(0.0, 1.0)
	s.ui.place("The fourteenth day")
	await s.say("thorne", "I've been through the lot, love. Three hundred and eighty-nine have gone to somebody, one year or another. Ten are firewood. There's one left.", { "eyes": "sad", "mouth": "flat" })
	T.reach.R = tb.position + Vector3(0.45, 1.1, 0.0)
	await tip(tb, 1.0)
	T.reach.R = null
	var w := wand("wand_stub", tb.position + Vector3(0, 0.0, 1.0))
	w.st = "air"
	w.v = Vector3(0, 0.4, 1.0)
	w.spin = Vector3(4, 0, 3)
	s.cut(YARD + Vector3(1.6, 0.6, -0.4), YARD + Vector3(0, 0.2, -1.4), 40)
	await s.wait(2.0)
	s.face(R, 0.2, 1.4, 36)
	R.pose = "kneel"
	await s.wait(0.5)
	R.look = w.n
	s.cut(R.position + Vector3(1.4, 0.9, -1.2), R.position + Vector3(0, 0.75, -0.4), 40)
	R.do("offer", 4.0)
	await s.say("reiner_uni", "Hello. You're last, too. I'm used to it, if you'd like some company.", { "eyes": "soft", "mouth": "smile" })
	w.st = "tremble"
	s.main.sfx("chirp", null, -6.0)
	await s.wait(1.2)
	# three hops toward him
	w.st = "hop"
	w.hops = 2
	w.yaw = 0.0
	var d: Vector3 = R.position - w.p
	w.v = Vector3(d.x, 0, d.z) * 0.42 + Vector3(0, 1.5, 0)
	w.spin = Vector3.ZERO
	s.cut(R.position + Vector3(1.2, 0.35, -0.9), R.position + Vector3(0, 0.25, -0.7), 38)
	await s.wait(1.2)
	R.feel("wide", "smile")
	s.face(R, 0.2, 1.1, 34)
	await s.wait(1.0)
	w.st = "tremble"
	s.main.sfx("chirp")
	await s.wait(0.6)
	w.st = "roll"
	w.v = (T.position - w.p).normalized() * 3.4
	w.v.y = 0.0
	w.yaw = atan2(w.v.x, w.v.z) + PI / 2
	s.main.sfx("roll")
	s.cut(R.position + Vector3(1.8, 1.0, 0.6), R.position + Vector3(-0.4, 0.4, -1.8), 44)
	await s.wait(1.3)
	w.st = "lie"
	w.p = T.position + Vector3(-0.3, 0.03, -0.4)
	await s.wait(0.6)
	s.face(R, 0.15, 1.1, 34)
	R.feel("sad", "flat")
	await s.wait(1.2)
	await s.say("reiner_uni", "It's all right. I'd have said no to me, too.", { "eyes": "sad", "mouth": "smile" })
	# the laughter; and who won't have it
	R.stand()
	var C: Node3D = act("cassian")
	s.cut(Vector3(-29.4, 1.7, -4.6), Vector3(-27.0, 1.2, -7.2), 46)
	music("wits")
	await s.say("cassian", "Even the STUB! Ladies and gentlemen, the book is closed. Fourteen days. Who had fourteen? ...I had fourteen.", { "eyes": "happy", "mouth": "shout", "do": "cheer" })
	s.main.sfx("laugh")
	for n in on:
		act(n).feel("happy", "grin")
		act(n).do("laugh", 2.6)
	await s.wait(1.6)
	var who := best_of(["lucan", "bet", "wim", "dorn"])
	a.flag.last = who
	s.main.sound.music("")
	match who:
		"lucan":
			var Lu := at("lucan", YARD.x + 2.6, YARD.z + 1.2, -2.2)
			Lu.hold("R", form("lucan") if a.flag.has("lucan2") else s.prop("wand_lucan"), GRIP)
			Lu.go_free([R.position + Vector3(0.95, 0, 0.1)], 1.2)
			s.cut(YARD + Vector3(-2.4, 1.5, 2.2), YARD + Vector3(0.4, 1.1, 0), 42)
			await s.until(func(): return Lu.path.is_empty(), 4.0)
			Lu.face_yaw = PI / 2
			Lu.look = C
			drop(Lu, "R")
			var gl: Node3D = a.keep(form("lucan") if a.flag.has("lucan2") else s.prop("wand_lucan"))
			s.add_child(gl)
			gl.position = Lu.position + Vector3(0.1, 0.06, 0.4)
			gl.rotation.y = 0.8
			s.main.sfx("clack")
			s.cut(Vector3(-29.7, 1.6, -8.9), Vector3(-33.0, 1.25, -8.1), 42)
			await s.say("lucan", "I was head of this school for two years by frightening people. I did it better than you, Roe, and I had nicer gloves. It was worth nothing. Put the slate down.", { "eyes": "stern", "mouth": "flat" })
			s.face(C, 0.2, 1.4, 36)
			C.feel("wide", "wavy")
			C.gest = ""
			await s.wait(1.4)
			s.face(Lu, 0.2, 1.4, 34)
			Lu.look = R
			await s.say("lucan", "I've left mine on the grass. I thought you shouldn't be the only one without.", { "eyes": "soft", "mouth": "smile" })
		"bet":
			var B: Node3D = act("bet")
			s.face(B, 0.2, 1.4, 38)
			B.feel("stern", "shout")
			B.do("castbig", 1.2)
			s.main.sfx("clunk")
			s.main.sfx("clack")
			await s.wait(0.3)
			s.main.sfx("clunk")
			await s.say("bet", "LAUGH OVER THAT, THEN! Go on! I can do this till breakfast!", { "eyes": "stern", "mouth": "shout", "do": "castbig" })
			for n in on:
				act(n).do("shield", 2.0)
				act(n).feel("squeeze", "wavy")
			await s.wait(1.6)
		"wim":
			var W: Node3D = act("wim")
			W.go_free([R.position + Vector3(0.9, 0, 0.4)], 1.6)
			s.cut(YARD + Vector3(-2.2, 1.4, 2.2), YARD + Vector3(0.3, 1.1, 0), 42)
			await s.until(func(): return W.path.is_empty(), 4.0)
			W.turn_to(R)
			W.look = R
			s.two(W, R, -1.0, 2.3, 42, 0.1)
			await s.say("wim", "I'd half of mine. If wands came in halves. I asked it, and it said it would think about it.", { "eyes": "sad", "mouth": "smile" })
		"dorn":
			var Do := at("dorn", YARD.x + 3.4, YARD.z - 1.2, PI / 2)
			Do.go_free([Vector3(-28.8, 0, -7.0)], 1.4)
			s.cut(Vector3(-27.7, 1.75, -4.6), Vector3(-28.8, 1.6, -7.0), 48)
			await s.until(func(): return Do.path.is_empty(), 4.0)
			Do.face_yaw = PI / 2
			for n in on:
				act(n).gest = ""
				act(n).feel("wide", "flat")
			await s.say("dorn", "Finished?", { "eyes": "half", "mouth": "flat" })
			await s.wait(1.2)
		_:
			s.face(R, 0.2, 1.3, 36)
			R.feel("down", "flat")
			await s.wait(1.6)
	music("low")
	R.look = null
	R.go_free([YARD + Vector3(3.0, 0, 3.4), Vector3(-25, 0, 2)], 1.2)
	s.cut(Vector3(-24.6, 1.6, 4.6), Vector3(-30, 1.2, -4.0), 44)
	s.shot.l1 = Vector3(-26, 1.1, 0)
	s.shot.d = 5.0
	await s.wait(3.4)
	var M: Node3D = act("maron")
	s.face(M, 0.2, 1.3, 32)
	M.look = R
	M.feel("sad", "flat")
	await s.wait(1.0)
	M.reach.R = M.position + Vector3(sin(M.yaw) * 0.18, 1.2, cos(M.yaw) * 0.18)
	s.cut(M.hand_pos("R") + Vector3(sin(M.yaw), 0.1, cos(M.yaw)) * 0.8, M.hand_pos("R"), 34)
	s.main.sfx("chirp", null, -16.0)
	s.sparkle(M.position + Vector3(0, 1.1, 0) + Vector3(sin(M.yaw), 0, cos(M.yaw)) * 0.2, 5, Color("e0b84a"))
	await s.wait(1.4)                                  # (something under her cape has stirred)
	s.face(M, 0.2, 1.2, 30)
	M.feel("wide", "small")
	await s.wait(1.2)
	M.reach.R = null
	await s.fade(1.0, 1.2)
	disarm(FIRST)
	a._free_people()


# =================================================================== 11 == --
const VISIT := {
	"wim": [["V", "You've folded the blanket. You never fold the blanket.", "sad", "wavy"], ["R", "I didn't want to leave you a mess.", "sad", "smile"], ["V", "I won't say don't. I'd only cry, and then you'd stay for the wrong reason.", "sad", "wavy"], ["V", "I'll be pretending to be asleep. If I hear the door, I'll pretend I didn't. But I'll have heard it.", "worry", "flat"]],
	"bet": [["V", "I came up the drainpipe. Don't look at me like that. You've your trunk out.", "half", "flat"], ["R", "I can't carry on being what they laugh at, Bet.", "sad", "frown"], ["V", "No. I know. So use the kitchen way, where nobody'll see you. And if you get as far as the gate and change your mind, the key turns both ways.", "soft", "flat"]],
	"kas": [["V", "It hasn't rung. I've sat with it all evening. I wanted to tell you, if you went tonight, that it hadn't rung yet.", "sad", "flat"], ["R", "Perhaps it won't.", "sad", "smile"], ["V", "Perhaps it's waiting for you to get to wherever it rings.", "soft", "flat"]],
	"isolde": [["V", "You are packing. I have eleven pages. I haven't slept. You can't go before I've finished.", "worry", "flat"], ["R", "Did you find out what's wrong?", "sad", "flat"], ["V", "Nothing is wrong. That's what the eleven pages say. They made room, Reiner. Nobody makes room for nothing.", "wide", "flat"]],
	"tobin": [["V", "I put another copper on \"never.\" I've put all my coppers on it. I'd be ruined if you went.", "worry", "smile"], ["R", "You should've kept your money.", "sad", "smile"], ["V", "I'd sooner be wrong with you than right with him. I've tried the other way.", "soft", "flat"]],
	"dorn": [["V", "I'll carry that.", "half", "flat"], ["R", "It's all right. I get a rhythm.", "sad", "smile"], ["V", "I know. I just didn't want it to be you that carried it, this time.", "soft", "flat"]],
	"lucan": [["V", "I won't argue. I came to say that I have been to a good many schools, and met a good many Beacons, and I've known one person I'd want beside me in the dark.", "soft", "flat"], ["R", "I can't do anything, Lucan.", "sad", "frown"], ["V", "No. You only stay. I've looked it up. There's no craft for it.", "soft", "smile"]],
	"sibyl": [["V", "The new ledger. I've brought it. There are sixty-one entries. I should like you to read whose name is most often in it.", "half", "flat"], ["R", "...That's me.", "wide", "small"], ["V", "Yes. I don't make errors. I thought you should have the figure, before you decided.", "soft", "flat"]],
	"vane": [["V", "Curfew.", "half", "flat"], ["R", "Yes, sir. I was only...", "worry", "flat"], ["V", "Packing. I see that. I've put a good many people out of places. I never enjoyed one who'd done nothing.", "half", "flat"], ["V", "The front door of this house sticks. I've been meaning to report it. I may not, before morning.", "lookL", "flat"]],
	"maron": [["V", "Don't look round. I'm not allowed above the rug, so I'm not here.", "half", "flat"], ["R", "Maron? How did you get up to the window?", "wide", "oh"], ["V", "Badly. Reiner: don't go before Tuesday.", "worry", "flat"], ["R", "What's on Tuesday?", "worry", "flat"], ["V", "I don't know yet. That's why I need till Tuesday.", "sad", "flat"]],
}


func d11_trunk() -> void:
	open(21.8)
	s.film()
	music("low")
	s.main.sound.air("night")
	take(["wim"])
	var b: Dictionary = s.stage.data.rooms.owl.beds[0]
	var bw: Dictionary = s.stage.data.rooms.owl.beds[1]
	s.stage.shut("owl_r0")
	var cx: float = (b.x + bw.x) * 0.5
	var R := reiner(cx - 0.3, b.z + 1.75, -PI / 2, b.y)
	var tk: Node3D = a.keep(s.put("trunk", Vector3(cx - 0.95, b.y, b.z + 1.75), PI / 2))
	var W: Node3D = act("wim")
	W.visible = true
	W.lie_at(Vector3(bw.x, bw.y, bw.z), bw.yaw)
	var hen: Node3D = a.keep(s.put("toyhen", Vector3(cx - 0.25, b.y + 0.744, b.z - 0.95), 0.6))
	R.look = tk
	R.pose = "kneel"
	s.move(Vector3(cx - 1.1, b.y + 1.4, b.z + 0.1), Vector3(cx - 0.4, b.y + 0.8, b.z + 1.7), Vector3(cx - 1.0, b.y + 1.25, b.z + 0.35), Vector3(cx - 0.4, b.y + 0.82, b.z + 1.7), 5.0, 54)
	await s.fade(0.0, 1.0)
	R.feel("sad", "flat")
	R.do("pickup", 1.6)
	await s.wait(1.6)
	await s.say("reiner_uni", "\"Dear Mam and Pa. I think I'll come home. I'm sorry about the cow.\"", { "eyes": "sad", "mouth": "frown" })
	s.cut(Vector3(cx + 0.5, b.y + 1.1, b.z - 0.1), hen.position, 34)
	await s.say("reiner_uni", "I went in at the door, Duchess. I've been in. I've seen it. I can say I've seen it.", { "eyes": "sad", "mouth": "wavy" })
	await s.wait(0.8)
	# who comes
	var l: Array = a.closest()
	var who: String = l[0] if not l.is_empty() else "wim"
	a.flag.visit = who
	var V: Node3D
	if who == "wim":
		W.get_up()
		W.place(Vector3(bw.x - 0.5, bw.y, bw.z + 0.62), -PI / 2 - 0.6)
		W.sit(0.46, "sitedge")
		V = W
		R.stand()
		R.place(Vector3(cx - 0.4, b.y, b.z + 1.75), PI * 0.6)
	elif who == "maron":                                 # at the window
		take(["maron"])
		V = at("maron", cx, b.z - 0.72, 0.0, b.y)          # (in over the sill, and sitting on the desk)
		V.sit(0.76, "sit")
		hen.position.x = cx - 0.42
		R.stand()
		R.place(Vector3(cx + 0.05, b.y, b.z + 0.6), PI)
	else:
		take([who])
		s.main.sfx("door")
		V = at(who, cx + 0.75, b.z + 2.0, -PI / 2, b.y)
		R.stand()
		R.place(Vector3(cx - 0.6, b.y, b.z + 1.7), PI / 2)
	V.look = R
	R.look = V
	if who != "maron": s.cut(Vector3(cx + 0.1, b.y + 1.45, b.z - 0.5), Vector3(cx + 0.1, b.y + 1.15, b.z + 1.8), 56)
	else: s.cut(Vector3(cx - 0.75, b.y + 1.6, b.z + 2.0), Vector3(cx + 0.05, b.y + 1.15, b.z - 0.5), 52)
	await s.wait(0.8)
	var i := 0
	for q in VISIT[who]:
		var A: Node3D = R if q[0] == "R" else V
		if i > 0: s.face(A, 0.3 if A == R else -0.3, 1.05, 44)
		await s.say("reiner_uni" if q[0] == "R" else who, q[1], { "eyes": q[2], "mouth": q[3] })
		i += 1
	await s.wait(0.6)
	await s.fade(1.0, 0.9)
	if who != "wim": V.visible = false
	V.stage = s.stage
	W.get_up()
	a._free_people()


# =================================================================== 12 == --
func d12_roofs() -> void:
	open(23.6)
	s.film()
	music("")
	s.main.sound.air("night")
	for p in s.campus.people:
		p.busy = true
		p.a.visible = false
	var who: String = String(a.flag.get("visit", "wim"))
	# how he gets out
	var R: Node3D
	var tk: Node3D = s.prop("trunk")
	if who == "bet":
		R = reiner(19.0, -22.4, PI)
		R.place(Vector3(0.4, 0, -22.0), 0.0)
		s.ui.place("By the kitchen way")
	elif who in ["vane", "sibyl"]:
		R = reiner(0.6, -4.2, 0.0)
		s.ui.place("The door sticks. It doesn't, tonight")
	else:
		R = reiner(-27.6, 21.0, PI / 2)
		s.ui.place("Out at the door")
	R.hold("R", tk, Transform3D(Basis(Vector3.UP, PI / 2), Vector3(0, -0.44, 0)))
	R.feel("down", "flat")
	if who == "bet": s.cut(Vector3(2.4, 1.4, -25.4), Vector3(0.4, 1.2, -21.6), 42)
	elif who in ["vane", "sibyl"]: s.cut(Vector3(2.4, 1.4, 0.6), Vector3(0.4, 1.2, -4.4), 42)
	else: s.cut(Vector3(-24.6, 1.4, 23.4), Vector3(-28, 1.3, 21), 42)
	await s.fade(0.0, 1.2)
	R.go_free([R.position + Vector3(sin(R.yaw), 0, cos(R.yaw)) * 2.4], 1.0)
	s.main.sfx("door", null, -8.0)
	if who == "kas":
		await s.wait(1.2)
		await s.tell("On a sill across the court, very softly, something rings.")
		R.look = Vector3(0, 3, -6)
	await s.wait(2.0)
	await s.fade(1.0, 0.6)
	# the court, toward the gate
	R.place(Vector3(0, 0, 18.6), 0.0)
	R.look = null
	s.cut(Vector3(2.2, 1.5, 31.0), Vector3(0, 1.3, 20), 42)
	s.shot.p1 = Vector3(1.4, 1.4, 28.4)
	s.shot.d = 5.0
	await s.fade(0.0, 0.8)
	R.go_free([Vector3(0, 0, 25.4)], 1.0)
	await s.until(func(): return R.path.is_empty(), 9.0)
	drop(R, "R")
	a.keep(s.put("trunk", Vector3(-0.55, 0, 25.4), PI / 2))
	s.main.sfx("clunk", null, -6.0)
	R.face_yaw = PI
	moon(Vector3(0.9, 2.4, 23.2))
	await s.wait(0.9)
	s.face(R, 0.3, 1.5, 36)
	await s.wait(0.5)
	await s.say("reiner_uni", "One more look. That's allowed.", { "eyes": "sad", "mouth": "smile" })
	R.look = Vector3(0, 12, -8)
	s.cut(R.position + Vector3(1.1, 1.75, 2.2), Vector3(-2, 10, -8), 50)
	await s.wait(2.0)
	# a glimmer on the roof
	music("roofs")
	var tt := tt_at(Vector3(-18.6, 11.25, -6.3), PI / 2, false)
	s.main.tt_pin = 11.25
	a.tt_in.x = 1.0
	a.tt_in.run = true
	s.main.sfx("chime", null, -10.0)
	tt.position = Vector3(-13.5, 11.25, -6.3)
	s.move(Vector3(-2.5, 5.2, 10.0), Vector3(-12.4, 12.2, -6.4), Vector3(-1.5, 5.2, 10.0), Vector3(2.0, 12.4, -6.4), 3.6, 32)
	var t0: float = s.time
	var last := 0.0
	while s.time < t0 + 3.6:
		if s.time > last + 0.09:
			last = s.time
			shape(tt.position + Vector3(-0.3, 0.6 + randf() * 0.9, randf_range(-0.2, 0.5)), Vector3(-0.4, -0.3, 0.15), 2.8, 2.1)
		await s.beat()
	s.face(R, 0.25, 1.3, 34)
	R.feel("wide", "oh")
	R.look = tt
	await s.say("reiner_uni", "Those shapes again." if a.flag.has("glimmer") else "There's somebody up there.", { "eyes": "wide", "mouth": "oh" })
	tt.position = Vector3(-2.0, 11.25, -6.3)
	s.cut(Vector3(0.5, 5.0, 12.0), tt.position + Vector3(1.0, 1.0, 0), 28)
	s.shot.l1 = Vector3(9, 12.4, -6.6)
	s.shot.d = 2.8
	t0 = s.time
	while s.time < t0 + 1.3:
		if s.time > last + 0.08:
			last = s.time
			shape(tt.position + Vector3(-0.3, 0.6 + randf() * 0.9, randf_range(-0.2, 0.5)), Vector3(-0.4, -0.3, 0.15), 2.8, 2.1)
		await s.beat()
	if knows("maron") >= 2:                               # she stops, for a breath, and looks down
		a.tt_in.x = 0.0
		s.cut(Vector3(0.5, 5.0, 12.0), tt.position + Vector3(0.6, 0.9, 0), 20)
		tt.t_yaw = 0.0
		await s.wait(1.0)
		tt.play("hatTip")
		await s.wait(1.6)
		s.face(R, 0.25, 1.3, 34)
		await s.say("reiner_uni", "...Did they just say good evening?", { "eyes": "wide", "mouth": "small" })
		a.tt_in.x = 1.0
	# something falls
	var w := wand("wand_black", tt.position + Vector3(0.2, 0.9, 0.3))
	w.st = "fall"
	var fallfrom: Vector3 = w.p
	var land := Vector3(7.4, 0.0, 18.2)
	s.main.sfx("spark")
	s.cut(R.position + Vector3(1.8, 1.5, -0.8), fallfrom, 36)
	t0 = s.time
	while s.time < t0 + 4.2:
		var u: float = (s.time - t0) / 4.2
		w.p = fallfrom.lerp(land, u) + Vector3(sin(u * 14.0) * 0.5 * (1.0 - u), 0, cos(u * 14.0) * 0.5 * (1.0 - u))
		w.p.y = lerpf(fallfrom.y, 0.14, u * u * 0.4 + u * 0.6)
		w.n.position = w.p
		w.n.rotation = Vector3(u * 22.0, u * 13.0, 0)
		s.shot.l0 = w.p
		s.shot.l1 = w.p
		w.n.scale = Vector3.ONE * lerpf(2.8, 1.0, u)
		if randf() < 0.6: s.burst(w.p, Color("fff6c8"), Color("ffc84a"), 4, 0.5, -0.4, lerpf(0.11, 0.03, u), 1.4)
		if s.time > last + 0.1 and s.time < t0 + 2.2:
			last = s.time
			shape(tt.position + Vector3(-0.3, 0.6 + randf() * 0.9, randf_range(-0.2, 0.5)), Vector3(-0.4, -0.3, 0.15), 2.8, 2.1)
		await s.beat()
	w.n.scale = Vector3.ONE
	w.n.rotation = Vector3(PI / 2, 0, 0.2)
	w.n.position = land + Vector3(0, 0.12, 0)
	moon(land + Vector3(0.6, 2.2, 1.4), 0.7)
	s.main.sfx("chime")
	s.burst(land + Vector3(0, 0.1, 0), Color("ffe9a8"), Color("ffc04a"), 30, 1.6, -1.0, 0.03, 1.2)
	tt_gone()
	s.main.tt_pin = NAN
	s.face(R, 0.2, 1.3, 34)
	R.look = land
	await s.say("reiner_uni", "They've dropped something. Hey! You've dropped your...", { "eyes": "wide", "mouth": "shout" })
	R.look = Vector3(14, 12, -6)
	await s.wait(1.0)
	await s.say("reiner_uni", "...Gone.", { "eyes": "worry", "mouth": "flat" })
	R.look = land
	R.go_free([Vector3(3.0, 0, 22.6), land + Vector3(-1.5, 0, 1.2)], 1.5)
	s.cut(land + Vector3(1.2, 0.35, -1.0), land + Vector3(-1.0, 0.7, 0.8), 40)
	await s.until(func(): return R.path.is_empty(), 9.0)
	R.turn_to(land)
	# a wand
	s.cut(land + Vector3(-0.5, 0.45, 0.8), land + Vector3(0, 0.18, 0), 32)
	await s.wait(1.2)
	R.pose = "kneel"
	s.cut(land + Vector3(1.5, 0.75, -0.9), land + Vector3(-0.55, 0.4, 0.45), 44)
	await s.say("reiner_uni", "It's a wand.", { "eyes": "wide", "mouth": "small" })
	await s.say("reiner_uni", "Somebody'll be missing you. Come on. I'll hand you in, on my way.", { "eyes": "soft", "mouth": "smile" })
	R.reach.R = land + Vector3(-0.25, 0.3, 0.2)
	R.hand.R = "open"
	await s.wait(0.9)
	# before he can touch it
	s.main.sound.music("")
	s.main.sfx("chirp")
	t0 = s.time
	s.cut(land + Vector3(-0.9, 0.6, 1.3), land + Vector3(0, 0.5, 0), 38)
	while s.time < t0 + 1.8:
		var u: float = smoothstep(0.0, 1.0, (s.time - t0) / 1.8)
		w.n.position = land + Vector3(0, 0.12 + u * 0.85 + sin(s.time * 5.0) * 0.02, 0)
		w.n.rotation = Vector3(lerpf(PI / 2, -PI / 2, u), u * TAU, 0)
		if randf() < 0.4: s.sparkle(w.n.position, 1, Color("ffe08a"))
		await s.beat()
	R.feel("wide", "oh")
	R.reach.R = null
	R.hand.R = ""
	s.face(R, 0.2, 1.2, 34)
	R.look = w.n
	await s.wait(1.0)
	s.cut(land + Vector3(1.6, 1.0, 1.4), land + Vector3(-0.5, 0.8, 0.4), 40)
	t0 = s.time
	var from: Vector3 = w.n.position
	while s.time < t0 + 1.6:
		var u: float = smoothstep(0.0, 1.0, (s.time - t0) / 1.6)
		w.n.position = from.lerp(R.head_pos() + Vector3(0.42, -0.04, -0.32), u)
		if randf() < 0.4: s.sparkle(w.n.position, 1, Color("ffe08a"))
		await s.beat()
	s.main.sfx("chirp")
	await s.wait(0.5)
	s.face(R, 0.5, 1.5, 42)
	await s.say("reiner_uni", "...No. No, you want somebody else. Everybody's agreed about that.", { "eyes": "wide", "mouth": "wavy" })
	s.main.sfx("chirp")
	t0 = s.time
	from = w.n.position
	while s.time < t0 + 0.5:
		w.n.position = from.lerp(R.head_pos() + Vector3(0.2, 0.0, -0.16), (s.time - t0) / 0.5)
		await s.beat()
	R.stand()
	R.do("flinch", 0.9)
	R.feel("squeeze", "shout")
	s.face(R, 0.2, 1.5, 44)
	await s.say("reiner_uni", "AAAH!", { "eyes": "squeeze", "mouth": "shout", "after": 0.0 })
	await s.fade(1.0, 0.25)
	drop(R, "R")


# =================================================================== 13 == --
## The wand after him: it comes on at a trot, hops what's in its way, pokes him when he stops.
func _chase_update(dt: float) -> void:
	var R: Node3D = s.hero
	var n: Node3D = chase.n
	if R == null or not is_instance_valid(n) or not chase.get("go", false): return
	chase.t += dt
	var to: Vector3 = R.position + Vector3(0, 1.15, 0) - n.position
	var l := Vector2(to.x, to.z).length()
	var want := 1.1 if chase.get("poke", 0.0) <= 0.0 else 2.4
	var sp: float = clampf((l - want) * 2.4, -2.0, 4.6 if l > 5.0 else 3.7)
	if chase.get("poke", 0.0) > 0.0: chase.poke -= dt
	var dir := Vector3(to.x, 0, to.z).normalized()
	n.position += dir * sp * dt
	n.position.y = lerpf(n.position.y, R.position.y + 1.15 + absf(sin(chase.t * 6.0)) * 0.16, 1.0 - exp(-6.0 * dt))
	# upright, leaning into it, waggling like something out of breath
	n.rotation = Vector3(-PI / 2 + clampf(sp * 0.16, -0.3, 0.6), atan2(dir.x, dir.z), sin(chase.t * 12.0) * 0.18)
	chase.sp = float(chase.get("sp", 0.0)) + dt
	if chase.sp > 0.07:
		chase.sp = 0.0
		s.sparkle(n.position - dir * 0.15, 1, Color("ffe08a"))
	if s.mode == "play" and not s.locked and l < 1.5 and chase.get("poke", 0.0) <= 0.0:
		chase.still = float(chase.get("still", 0.0)) + (dt if R.speed < 0.6 else -dt)
		if chase.still > 0.5:
			chase.still = 0.0
			chase.poke = 1.3
			s.main.sfx("chirp")
			R.do("flinch", 0.7)
			R.feel("squeeze", "shout", 0.9)
			R.say_bubble(["Stop that!", "Go home!", "I haven't got anything!", "I'm nobody! Ask anyone!", "Shoo!"][randi() % 5], s.campus.font, 1.4)
			R.talking = 0.6
	else: chase.still = maxf(0.0, float(chase.get("still", 0.0)) - dt)


func d13_chase() -> void:
	open(23.7)
	for p in s.campus.people:
		p.busy = true
		p.a.visible = false
	s.film()
	music("chase")
	s.main.sound.air("night")
	var R := reiner(5.6, 19.6, -2.6)
	var n: Node3D = a.keep(s.put("wand_black", Vector3(7.2, 1.2, 18.4)))
	var gl := moon(Vector3.ZERO, 0.9, Color("ffe6a8"), 4.5)
	gl.reparent(n, false)
	chase = { "n": n, "t": 0.0, "go": false }
	for d in ["main", "north"]:
		s.stage.doors[d].want = true
		s.stage.doors[d].by_hand = true
	R.feel("wide", "shout")
	s.cut(Vector3(2.4, 1.3, 23.0), Vector3(5.0, 1.0, 19.2), 46)
	await s.fade(0.0, 0.25)
	R.go_free([Vector3(1.6, 0, 22.4), Vector3(-3.4, 0, 22.2), Vector3(-7, 0, 17)], 4.0)
	chase.go = true
	s.main.sfx("chirp")
	await s.wait(1.4)
	s.cut(Vector3(-9.0, 1.0, 14.4), Vector3(-4, 1.0, 20), 46)
	await s.say("reiner_uni", "I don't WANT anything! I've got a TRUNK!", { "eyes": "wide", "mouth": "shout", "after": 0.0 })
	R.path = []
	s.play()
	R.feel("wide", "shout")
	s.ui.objective("Run!")
	s.ui.toast("Shift to run. Don't stop: it pokes.")
	var id: int = a.run_id
	# round the fountain
	await a.reach(Vector3(-6.0, 0, 11.6), 2.4)
	if a.run_id != id: return
	await _beat_fountain(R, n)
	s.ui.objective("Into the school! It can't follow you through a door")
	await a.reach(Vector3(0, FY[0], -8.0), 2.6)
	await _beat_door(R, n)
	s.ui.objective("It can. Out by the north door!")
	await a.reach(Vector3(0, 0, -22.6), 2.6)
	await _beat_vane(R, n)
	s.ui.objective("Round the west side, and don't look back!")
	await a.reach(Vector3(-23.6, 0, -12.0), 3.0)
	s.ui.toast("...Don't look back.")
	await a.reach(Vector3(-20.6, 0, -2.6), 3.2)
	# the wall
	s.film()
	R.place(Vector3(-11.2, 0, 2.6), PI)
	n.position = Vector3(-11.2, 1.3, 6.2)
	R.go_free([Vector3(-11.2, 0, -5.0)], 4.2)
	R.look = n
	R.feel("wide", "shout")
	s.cut(Vector3(-7.6, 1.5, -3.4), Vector3(-11.2, 1.1, 0.6), 46)
	s.shot.l1 = Vector3(-11.2, 0.9, -4.6)
	s.shot.d = 1.8
	await s.until(func(): return R.position.z < -4.4, 3.0)
	R.path = []
	R.look = null
	R.position.z = -5.05
	R.speed = 0.0
	s.main.sfx("thump")
	s.shake = 1.0
	s.main.sound.music("")
	chase.go = false
	s.burst(Vector3(-11.2, 1.3, -5.8), Color("f4e8a0"), Color("ffffff"), 14, 1.8, -2.0, 0.03, 0.6)
	R.do("flinch", 0.5)
	await s.wait(0.45)
	R.position.z = -4.6
	R.yaw = PI
	R.do("fall", 60.0)
	down = true
	R.feel("squeeze", "wavy")
	for k in 5: shape(R.head_pos() + Vector3(sin(k * 1.3) * 0.35, 0.1, cos(k * 1.3) * 0.35), Vector3(0, 0.1, 0), 2.2, 0.4)
	s.cut(Vector3(-9.4, 0.9, -3.0), Vector3(-11.2, 0.5, -4.6), 42)
	await s.wait(1.4)
	moon(Vector3(-10.2, 1.6, -5.2), 0.6)
	s.cut(Vector3(-9.9, 0.8, -5.5), Vector3(-11.2, 0.6, -4.4), 46)
	await s.say("reiner_uni", "...Ow.", { "eyes": "squeeze", "mouth": "wavy" })
	await s.fade(1.0, 0.5)
	for d in ["main", "north"]: s.stage.doors[d].erase("by_hand")


func _beat_fountain(R: Node3D, n: Node3D) -> void:
	s.locked = true
	s.film()
	s.locked = true
	R.place(Vector3(-2.6, 0, 11.0), -0.6)
	n.position = Vector3(2.8, 1.2, 16.4)
	chase.go = false
	R.look = n
	R.turn_to(n)
	R.feel("worry", "wavy")
	s.cut(Vector3(-5.4, 1.5, 9.6), Vector3(0, 1.0, 14), 44)
	await s.wait(0.5)
	# straight across the water
	var t0: float = s.time
	while s.time < t0 + 1.3:
		var u: float = (s.time - t0) / 1.3
		n.position = Vector3(2.8, 1.2, 16.4).lerp(Vector3(-1.5, 0.9, 12.4), u) + Vector3(0, -sin(u * PI) * 0.5, 0)
		n.rotation = Vector3(-PI / 2 + 0.5, -2.4, sin(s.time * 14.0) * 0.2)
		if u > 0.3 and u < 0.75 and randf() < 0.5: s.burst(Vector3(n.position.x, 0.6, n.position.z), Color("8cc8f0"), Color("d0ecff"), 6, 1.6, -6.0, 0.03, 0.6)
		await s.beat()
	s.main.sfx("splash")
	t0 = s.time
	s.cut(Vector3(-3.4, 1.2, 13.6), n.position, 36)
	while s.time < t0 + 0.9:                              # it shakes itself, like a dog
		n.rotation = Vector3(-PI / 2, -2.4, sin(s.time * 50.0) * 0.7)
		if randf() < 0.6: s.burst(n.position, Color("8cc8f0"), Color("d0ecff"), 4, 1.8, -6.0, 0.025, 0.5)
		await s.beat()
	s.main.sfx("chirp")
	R.feel("wide", "shout")
	s.face(R, 0.2, 1.4, 38)
	await s.say("reiner_uni", "It's WAVING at me!", { "eyes": "wide", "mouth": "shout", "after": 0.0 })
	s.play()
	chase.go = true
	R.face_yaw = null


func _beat_door(R: Node3D, n: Node3D) -> void:
	s.film()
	chase.go = false
	var d: Dictionary = s.stage.doors["main"]
	R.place(Vector3(0.5, FY[0], -7.4), 0.0)
	n.position = Vector3(0.1, 1.3, -3.4)
	R.reach.R = Vector3(0.4, 1.2, -6.4)
	R.reach.L = Vector3(0.0, 1.2, -6.4)
	d.want = false
	d.hold = 0.0
	d.by_hand = true
	R.feel("stern", "wavy")
	s.cut(Vector3(2.2, 1.5, -9.6), Vector3(0.2, 1.2, -6.6), 44)
	await s.wait(1.2)
	R.reach = { "L": null, "R": null }
	R.face_yaw = PI
	moon(Vector3(1.0, 2.4, -9.0), 0.7, Color("ffe0b0"))
	await s.wait(0.5)
	await s.say("reiner_uni", "Ha!", { "eyes": "happy", "mouth": "grin" })
	s.main.sfx("knock")
	R.do("flinch", 0.7)
	await s.wait(0.9)
	s.main.sfx("knock")
	R.feel("worry", "wavy")
	await s.say("reiner_uni", "...There's nobody in!", { "eyes": "worry", "mouth": "wavy" })
	await s.wait(0.5)
	# the window
	n.position = Vector3(-3.6, 2.2, -5.6)
	s.cut(Vector3(1.8, 1.5, -10.2), Vector3(-2.0, 1.5, -6.6), 46)
	var t0: float = s.time
	while s.time < t0 + 1.2:
		n.position = Vector3(-3.6, 2.2, -5.4).lerp(Vector3(-1.2, 1.35, -7.4), smoothstep(0.0, 1.0, (s.time - t0) / 1.2))
		n.rotation = Vector3(-PI / 2 + 0.3, 2.4, sin(s.time * 12.0) * 0.2)
		await s.beat()
	s.main.sfx("chirp")
	R.look = n
	R.turn_to(n)
	R.do("flinch", 0.9)
	R.feel("wide", "shout")
	await s.wait(0.5)
	s.face(R, -0.7, 1.4, 40)
	await s.say("reiner_uni", "The WINDOW'S open. Who leaves a WINDOW open?", { "eyes": "wide", "mouth": "shout", "after": 0.0 })
	s.play()
	R.look = null
	R.face_yaw = null
	chase.go = true


func _beat_vane(R: Node3D, n: Node3D) -> void:
	s.film()
	chase.go = false
	var V := at("vane", -4.6, -24.8, PI / 2)
	V.hold("R", s.prop("bullseye"), Transform3D(Basis(), Vector3(0, -0.42, 0.02)))
	R.place(Vector3(0.2, 0, -23.0), -2.0)
	n.position = Vector3(1.6, 1.2, -21.6)
	R.go_free([Vector3(-2.6, 0, -23.6), Vector3(-8, 0, -24.2)], 4.0)
	s.cut(Vector3(-7.4, 1.6, -27.4), Vector3(-3.4, 1.2, -24.2), 46)
	V.look = R
	moon(Vector3(-5.4, 2.4, -27.0))
	chase.go = true
	await s.wait(1.0)
	V.feel("wide", "oh")
	if knows("vane") >= 2:
		s.face(V, 0.2, 1.5, 36)
		V.look = n
		await s.say("vane", "...No.", { "eyes": "half", "mouth": "flat" })
		V.face_yaw = PI
		V.look = null
		moon(Vector3(-4.6, 2.4, -27.4), 0.3)
		await s.wait(0.7)
		s.face(V, 0.3, 1.5, 38)
		await s.say("vane", "I have decided to ask about that in the morning.", { "eyes": "shut", "mouth": "flat" })
	else:
		s.face(V, 0.2, 1.5, 36)
		await s.say("vane", "You! Boy! Is that wand YOURS?", { "eyes": "wide", "mouth": "shout" })
		await s.say("reiner_uni", "NO! That's what I keep TELLING it!", { "eyes": "wide", "mouth": "shout", "as": "Reiner, going by" })
		V.go_free([Vector3(-8, 0, -24.6), Vector3(-16, 0, -25.4)], 2.6)
		await s.wait(0.8)
		V.do("fall", 2.0)
		s.main.sfx("thump", null, -6.0)
		await s.wait(0.8)
	R.path = []
	s.play()
	R.place(Vector3(-9.4, 0, -24.8), -PI / 2)
	s.cam_yaw = PI / 2
	n.position = Vector3(-6.4, 1.2, -24.6)
	V.visible = false
	drop(V, "R")
	chase.go = true


# =================================================================== 14 == --
func _staff_update(dt: float) -> void:
	staff.t += dt
	if staff.has("gem"): (staff.gem as Node3D).position = Vector3(0, 74 * 0.024 + sin(staff.t * 2.2) * 0.03, 0)
	if staff.has("gem"): (staff.gem as Node3D).rotation.y = staff.t * 1.6
	for i in staff.get("rings", []).size():
		var r: Node3D = staff.rings[i]
		r.position.y = 0.5 + i * 0.55 + sin(staff.t * 1.4 + i * 2.0) * 0.12
		r.rotation = Vector3(sin(staff.t + i) * 0.16, staff.t * (1.6 if i % 2 else -1.3), cos(staff.t * 0.8 + i) * 0.16)
	staff.sp = float(staff.get("sp", 0.0)) + dt
	if staff.get("on", false) and staff.sp > 0.03:         # light winding up it
		staff.sp = 0.0
		var k: float = staff.t * 5.0
		var root: Node3D = staff.root
		for q in 2:
			var an := k + q * PI
			var h: float = fmod(staff.t * 0.8 + q * 0.5, 1.0) * 2.0
			s.burst(root.global_position + Vector3(sin(an) * 0.5, h, cos(an) * 0.5), [Color("ffe29a"), Color("c8b4ff")][q], [Color("fff6d8"), Color("8ad8ff")][q], 2, 0.35, 0.4, 0.028, 0.9)


func d14_staff() -> void:
	open(23.8)
	for p in s.campus.people:
		p.busy = true
		p.a.visible = false
	s.film()
	music("")
	s.main.sound.air("night")
	s.indoor_auto = true
	var at0 := Vector3(-11.2, 0, -4.6)
	var R := reiner(at0.x, at0.z, 0.0)
	R.do("fall", 60.0)
	down = true
	R.feel("worry", "wavy")
	var n: Node3D = a.keep(s.put("wand_black", Vector3(at0.x, 1.2, 2.6)))
	n.rotation = Vector3(-PI / 2, 0, 0)
	var key := OmniLight3D.new()
	key.position = at0 + Vector3(1.4, 2.6, 2.2)
	key.light_color = Color("a8bcff")
	key.light_energy = 1.0
	key.omni_range = 7.0
	s.add_child(key)
	a.keep(key)
	R.look = n
	s.cut(at0 + Vector3(2.2, 0.9, 2.4), at0 + Vector3(0, 0.5, 0.3), 42)
	await s.fade(0.0, 0.8)
	await s.wait(0.6)
	# it catches up, and stops, and stands there in the air
	var t0: float = s.time
	s.cut(at0 + Vector3(-1.7, 0.6, -0.4), at0 + Vector3(0, 0.75, 2.0), 46)
	while s.time < t0 + 2.2:
		var u: float = smoothstep(0.0, 1.0, (s.time - t0) / 2.2)
		n.position = Vector3(at0.x, 1.2, 2.6).lerp(at0 + Vector3(0, 0.95, 1.1), u) + Vector3(0, absf(sin(u * 12.0)) * 0.1 * (1.0 - u), 0)
		n.rotation = Vector3(-PI / 2, 0, sin(s.time * 9.0) * 0.1 * (1.0 - u))
		if randf() < 0.3: s.sparkle(n.position, 1, Color("ffe08a"))
		await s.beat()
	var hang: Vector3 = n.position
	# hangs there upright, bobbing a little: `nod` tips it forward and back, `tilt` sideways
	var nod := func(times: int) -> void:
		for k in times:
			var tn: float = s.time
			s.main.sfx("chirp", null, -6.0)
			while s.time < tn + 0.46:
				var u: float = (s.time - tn) / 0.46
				n.rotation = Vector3(-PI / 2 - sin(u * PI) * 0.65, PI, 0)
				n.position = hang + Vector3(0, -sin(u * PI) * 0.04, 0)
				await s.beat()
	n.rotation = Vector3(-PI / 2, PI, 0)
	s.cut(at0 + Vector3(-0.9, 0.85, -0.5), hang, 40)
	await s.wait(1.0)
	await nod.call(1)
	s.cut(hang + Vector3(0.7, 0.2, 0.9), at0 + Vector3(0, 0.62, 0.1), 40)
	R.feel("wide", "small")
	await s.say("reiner_uni", "...You nodded.", { "eyes": "wide", "mouth": "small" })
	s.cut(at0 + Vector3(-0.9, 0.85, -0.5), hang, 36)
	await nod.call(2)
	s.cut(hang + Vector3(0.7, 0.2, 0.9), at0 + Vector3(0, 0.62, 0.1), 38)
	await s.say("reiner_uni", "It's caught me. It's got me against a wall. And it hasn't done anything. It's only waiting.", { "eyes": "lookL", "mouth": "flat", "as": "Reiner, thinking" })
	await s.say("reiner_uni", "Four hundred of them ran. This one ran after me.", { "eyes": "down", "mouth": "small", "as": "Reiner, thinking" })
	await s.wait(0.6)
	R.feel("worry", "flat")
	await s.say("reiner_uni", "Do you want me to... hold you?", { "eyes": "worry", "mouth": "flat" })
	s.cut(at0 + Vector3(-0.8, 0.85, -0.4), hang, 34)
	await nod.call(3)
	s.cut(hang + Vector3(0.7, 0.2, 0.9), at0 + Vector3(0, 0.62, 0.1), 36)
	var dear := String(a.flag.get("visit", "wim"))
	await s.say("reiner_uni", "I'm not anybody, you know. I ought to say. I've asked. I was on my way home.", { "eyes": "sad", "mouth": "smile" })
	var tl: float = s.time                              # it leans its head, as a dog does
	s.cut(at0 + Vector3(-0.8, 0.85, -0.4), hang, 34)
	s.main.sfx("chirp")
	while s.time < tl + 1.2:
		n.rotation = Vector3(-PI / 2, PI, sin(clampf((s.time - tl) / 0.5, 0.0, 1.0) * PI / 2) * 0.5)
		await s.beat()
	s.face(R, 0.25, 1.1, 36)
	if knows(dear) >= 4:
		var said: Dictionary = { "wim": "\"I've decided to be sure about something.\" That's what Wim said.", "bet": "\"Something'll have you. It's only slow.\" That's what Bet said.", "kas": "\"Waiting for you to get to wherever it rings.\" ...Kas, I think it's rung.", "isolde": "\"They were making room.\" Isolde. You were right. You're going to be so annoyed.", "tobin": "\"Never,\" Tobin put. All his coppers.", "dorn": "You don't hold it. You let it sit. I said that. I said that to Dorn.", "lucan": "\"Have you ever asked it?\" I told Lucan that. I never thought they might ask back.", "sibyl": "\"What people did that they needn't have.\" Nobody's making you, are they?", "vane": "\"You could ask them, instead of chasing them.\" ...You might have thought of that, too.", "maron": "\"Never under the cup they've put in front of you.\" Oh. Oh, Maron." }
		await s.say("reiner_uni", said[dear], { "eyes": "soft", "mouth": "smile" })
	else: await s.say("reiner_uni", "It's all right. You needn't hurry. ...I think I'm the one who's hurrying.", { "eyes": "soft", "mouth": "smile" })
	# the bold decision
	down = false
	R.gest = ""
	R.body.position = Vector3.ZERO
	R.pose = "kneel"
	s.cut(at0 + Vector3(2.0, 0.95, 1.4), at0 + Vector3(0, 0.75, 0.6), 40)
	await s.wait(0.8)
	s.mode = "play"
	s.locked = false
	s.hero.set_meta("held", true)
	a.got = false
	s.uses = [{ "pos": at0, "r": 4.0, "label": "Touch it", "first": true, "f": func(): a.got = true }]
	s.locked = false
	s.ui.prompt("E   Touch it")
	var tw: float = s.time
	while not a.got:
		R.speed = 0.0
		R.position = at0
		R.pose = "kneel"
		s.use_now = s.uses[0]
		s.ui.prompt("E   Touch it")
		n.position = hang + Vector3(0, sin(s.time * 2.2) * 0.03, 0)
		if s.main.dev_auto and s.time > tw + 1.0: a.got = true
		await s.beat()
	s.film()
	s.uses = []
	s.ui.prompt("")
	if R.has_meta("driven"): R.remove_meta("driven")
	R.pose = "kneel"
	R.reach.R = n
	R.hand.R = "open"
	s.cut(hang + Vector3(1.35, 0.2, 0.35), hang + Vector3(0, 0.02, -0.4), 40)
	await s.wait(1.0)
	s.main.sfx("chime")
	R.hand.R = "fist"
	await s.wait(0.5)
	# what it was
	music("staff")
	s.main.sfx("transform")
	s.shake = 1.0
	n.visible = false
	s.burst(hang, Color("fff6d8"), Color("ffe29a"), 90, 5.0, 0.0, 0.05, 1.2)
	s.burst(hang, Color("c8b4ff"), Color("8ad8ff"), 60, 3.4, 0.0, 0.04, 1.6)
	var root := Node3D.new()
	s.add_child(root)
	a.keep(root)
	root.position = Vector3(hang.x - 0.1, 0.0, hang.z - 0.25)
	var stf: Node3D = s.prop("staff")
	root.add_child(stf)
	var gem: Node3D = s.prop("staff_gem")
	root.add_child(gem)
	var rings: Array = []
	for k in 3:
		var rg: Node3D = s.prop("staff_ring")
		root.add_child(rg)
		rg.scale = Vector3.ONE * (1.7 - k * 0.22)
		rings.append(rg)
	for q in [stf, gem] + rings:
		for g in q.find_children("*", "GeometryInstance3D", true, false) + [q]: if g is GeometryInstance3D: g.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var glow := OmniLight3D.new()
	glow.light_color = Color("e8d4ff")
	glow.light_energy = 1.3
	glow.omni_range = 11.0
	glow.position = Vector3(0, 1.9, 0.3)
	root.add_child(glow)
	staff = { "t": 0.0, "root": root, "gem": gem, "rings": rings, "on": true }
	var grip := Node3D.new()
	root.add_child(grip)
	grip.position = Vector3(-0.02, 1.08, 0)
	R.stand()
	R.reach.R = grip
	R.hand.R = "fist"
	R.feel("wide", "oh")
	R.place(at0 + Vector3(0.12, 0, 0.35), 0.15)
	R.reach.R = grip
	R.look = gem
	t0 = s.time
	s.move(at0 + Vector3(2.8, 0.5, 3.4), at0 + Vector3(0, 1.2, 0.6), at0 + Vector3(-2.6, 1.4, 3.6), at0 + Vector3(0, 1.35, 0.6), 7.0, 46)
	while s.time < t0 + 1.2:
		root.scale = Vector3.ONE * lerpf(0.2, 1.0, smoothstep(0.0, 1.0, (s.time - t0) / 1.0))
		await s.beat()
	root.scale = Vector3.ONE
	for k in 24:
		var an := k / 24.0 * TAU
		s.burst(at0 + Vector3(sin(an) * 2.4, 0.1, 0.6 + cos(an) * 2.4), Color("ffd0ea"), Color("fff0f8"), 2, 1.4, 0.8, 0.035, 2.0, 25.0)
	await s.wait(3.2)
	s.face(R, 0.35, 1.3, 36)
	R.feel("wide", "small")
	await s.say("reiner_uni", "...Oh.", { "eyes": "wide", "mouth": "small" })
	# it's felt, all over the school
	await s.fade(1.0, 0.3)
	a.ch1.lean = Vector2.ZERO
	s.indoor = 0.9
	s.cut(Vector3(3.2, 1.6, -18.0), Vector3(4.3, 1.5, -19.2), 30)
	await s.fade(0.0, 0.3)
	t0 = s.time
	s.main.sfx("chime", null, -6.0)
	while s.time < t0 + 1.8:                              # the founder's candle bows
		a.ch1.lean = Vector2(-0.75, 0.2) * smoothstep(0.0, 1.0, (s.time - t0) / 1.0)
		await s.beat()
	var bw: Dictionary = s.stage.data.rooms.owl.beds[1]
	var W: Node3D = act("wim")
	W.visible = true
	W.lie_at(Vector3(bw.x, bw.y, bw.z), bw.yaw)
	var ww: Node3D = a.keep(s.put("form_wim", Vector3(bw.x - 0.5, bw.y + 0.8, bw.z - 0.5)))
	s.cut(Vector3(bw.x - 1.9, bw.y + 1.4, bw.z + 0.8), Vector3(bw.x - 0.35, bw.y + 0.98, bw.z - 0.4), 46)
	t0 = s.time
	s.main.sfx("chirp", null, -8.0)
	while s.time < t0 + 1.9:                              # Wim's cat, up off its cushion, all ears
		var u: float = smoothstep(0.0, 1.0, (s.time - t0) / 1.0)
		ww.position = Vector3(bw.x - 0.5, bw.y + 0.6 + u * 0.4, bw.z - 0.5)
		ww.rotation = Vector3(-PI / 2 * u, lerpf(0.4, -0.9, u) + sin(s.time * 40.0) * 0.03, 0)
		await s.beat()
	W.get_up()
	W.visible = false
	s.indoor = 0.0
	a.ch1.lean = Vector2.ZERO
	s.move(at0 + Vector3(-3.4, 2.2, 4.6), at0 + Vector3(0, 1.4, 0.5), at0 + Vector3(2.4, 2.8, 5.2), at0 + Vector3(0, 1.5, 0.5), 6.0, 44)
	R.feel("happy", "grin")
	await s.say("reiner_uni", "You're enormous!", { "eyes": "happy", "mouth": "grin" })
	R.do("laugh", 1.6)
	await s.wait(2.2)
	# and then it isn't
	s.main.sfx("fizz")
	staff.on = false
	t0 = s.time
	R.feel("worry", "flat")
	s.cut(at0 + Vector3(1.6, 1.2, 2.4), at0 + Vector3(0, 1.2, 0.5), 40)
	while s.time < t0 + 1.0:
		glow.light_energy = 1.3 * (0.3 + 0.7 * randf()) * (1.0 - (s.time - t0))
		root.scale = Vector3.ONE * (1.0 + sin(s.time * 50.0) * 0.02)
		await s.beat()
	s.main.sound.music("")
	s.main.sfx("poof")
	s.smoke(root.position + Vector3(0, 1.1, 0), 18, false)
	root.visible = false
	glow.visible = false
	staff = {}
	R.reach.R = null
	var small: Node3D = s.prop("wand_black")
	R.hold("R", small, GRIP)
	R.do("offer", 30.0)
	R.look = at0 + Vector3(0.1, 1.0, 1.4)
	R.feel("wide", "oh")
	s.main.sfx("clack")
	await s.wait(1.6)
	s.face(R, 0.2, 1.2, 34)
	await s.wait(1.2)
	R.feel("wide", "flat")
	await s.wait(1.0)
	await s.say("reiner_uni", "...What?", { "eyes": "wide", "mouth": "small" })
	await s.say("reiner_uni", "Everybody else's stayed.", { "eyes": "wide", "mouth": "flat" })
	s.cut(R.hand_pos("R") + Vector3(0.45, 0.2, 0.5), R.hand_pos("R"), 30)
	s.main.sfx("chirp", null, -4.0)
	t0 = s.time
	while s.time < t0 + 1.4:
		small.transform = GRIP * Transform3D(Basis(Vector3.RIGHT, sin((s.time - t0) * 9.0) * 0.12 * (1.0 - (s.time - t0) / 1.4)))
		await s.beat()
	s.move(at0 + Vector3(1.8, 1.4, 2.8), at0 + Vector3(0, 1.2, 0.3), at0 + Vector3(6, 7, 16), at0 + Vector3(0, 3, -1), 7.0, 42)
	await s.wait(4.2)
	await s.fade(1.0, 1.0)
	# up on the roofs, somebody pats her pockets
	drop(R, "R")
	R.visible = false
	var tt := tt_at(Vector3(15.6, 11.25, -6.3), -0.5, false)
	s.main.tt_pin = 11.25
	s.cut(Vector3(14.2, 12.2, -2.2), Vector3(15.6, 12.5, -6.3), 40)
	music("night")
	await s.fade(0.0, 0.8)
	s.main.tt.face_base = "surprised"
	tt.play("hatFix")
	await s.wait(2.0)
	await s.say("maron", "Oh, bother.", { "as": "???" })
	for k in 10:
		shape(tt.position + Vector3(randf_range(-0.6, 0.6), 0.4 + randf() * 1.3, randf_range(-0.3, 0.6)), Vector3(0, 0.4, 0), 1.8, 1.0)
		await s.wait(0.06)
	s.main.fx.card_puff(tt.position + Vector3(0, 0.9, 0), 16)
	s.main.sfx("card")
	tt_gone()
	s.main.tt_pin = NAN
	await s.wait(1.0)
	await s.fade(1.0, 0.9)
	await s.title_card("TRAP TRICK", "End of Chapter Two", 5.0)
	R.gest = ""
	a._free_people()
