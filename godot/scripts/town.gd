extends Node3D
## The town (baked from js/town.js and js/people.js): its houses, square and alley, and the townsfolk going about their
## work: the baker kneading, the smith at the anvil, sellers calling out, shoppers going stall to stall, guards on their
## rounds, children chasing round the fountain, a bard, a woodcutter, an innkeeper sweeping, a mage with her book, an old
## man on a bench, a water carrier, a farmer with a sack of flour. Chickens, a black cat by the door in the alley, the
## windmill turning. Townsfolk mind their own business; G near one of them gets a word and, for a while, their attention.

var main: Node3D
var data: Dictionary
var walk: Array = []
var colliders: Array = []
var npcs: Array = []
var hens: Array = []
var clouds: Array[Node3D] = []
var door_leaf: Node3D
var door_base: Basis
var door_light: OmniLight3D
var door_sparks: GPUParticles3D
var door_open := 0.0                 # 0 shut .. 1 open (main drives it when she goes through)
var cat_head: Node3D
var cat_base: Basis
var sails: Node3D
var sails_base: Basis
var sparks: GPUParticles3D
var chips: GPUParticles3D
var t := 0.0
var bubble_font: Font
var rng := RandomNumberGenerator.new()
var extra: Array = []                # the story's people in the town: walked round too
var near_seen := {}                  # dev: the closest any two have come

const NPC_R := 0.3


func setup(main_node: Node3D, bake: Dictionary) -> void:
	main = main_node
	data = bake.town
	walk = data.walk
	colliders = data.colliders
	rng.seed = 11
	bubble_font = main.title_font if main.title_font else SystemFont.new()
	var fw: Node3D = load("res://scripts/fountain.gd").new()      # (the traveller stands on its bowl: no jet)
	add_child(fw)
	fw.setup(main, false)
	# the ground: the town's cobbles, fields beyond, a green plane to the horizon
	var gs: float = data.groundSize
	var plane := PlaneMesh.new()
	plane.size = Vector2(gs, gs)
	var gm := StandardMaterial3D.new()
	gm.albedo_texture = load("res://assets/town_ground.png")
	gm.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST_WITH_MIPMAPS_ANISOTROPIC
	gm.roughness = 1.0
	gm.specular_mode = BaseMaterial3D.SPECULAR_DISABLED
	var g := MeshInstance3D.new()
	g.mesh = plane
	g.material_override = gm
	add_child(g)
	var far := PlaneMesh.new()
	far.size = Vector2(900, 900)
	var fm := StandardMaterial3D.new()
	fm.albedo_color = Color.hex((int(data.farColor) << 8) | 0xff)
	fm.roughness = 1.0
	var f := MeshInstance3D.new()
	f.mesh = far
	f.material_override = fm
	f.position.y = -0.03
	add_child(f)
	# the streets: their own ground, a pixel to each of her voxels
	var core: Dictionary = data.core
	var cp := PlaneMesh.new()
	cp.size = Vector2(core.size, core.size)
	var cm := ShaderMaterial.new()
	cm.shader = preload("res://scripts/ground.gdshader")
	cm.set_shader_parameter("tex", load("res://assets/town_core.png"))
	var cg := MeshInstance3D.new()
	cg.mesh = cp
	cg.material_override = cm
	if main.light_off.has("core"): cg.visible = false
	cg.position = Vector3(core.x, 0.004, core.z)
	cg.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(cg)
	# the town itself
	var w: Node3D = load("res://assets/town.glb").instantiate()
	add_child(w)
	main.voxelize(w, null if main.light_off.has("grain") else main.grain_mat)
	var by_name := {}
	for n in w.find_children("*", "Node3D", true, false): by_name[String(n.name)] = n
	for n in w.find_children("*_nc*", "Node3D", true, false):
		for gi in [n] + n.find_children("*", "GeometryInstance3D", true, false):
			if gi is GeometryInstance3D: gi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	# the houses: each is shadowed by a plain block of its own shape, and hides what's behind it from being drawn at all
	for i in (data.houses as Array).size():
		var h: Array = data.houses[i]
		var house: Node3D = by_name.get("house_%d" % i)
		var block: Node3D = by_name.get("shadow_%d" % i)
		if block:
			_each_geo(block, func(gi): gi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_SHADOWS_ONLY)
			if house: _each_geo(house, func(gi): gi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF)
		var box := BoxOccluder3D.new()
		var low: float = h[6]                                # (a forge is open below)
		box.size = Vector3(float(h[3]) - 0.3, float(h[5]) - low - 0.1, float(h[4]) - 0.3)
		var oc := OccluderInstance3D.new()
		oc.occluder = box
		oc.position = Vector3(h[0], low + box.size.y / 2.0, h[1])
		oc.rotation.y = h[2]
		add_child(oc)
	# the little things are drawn only from nearby; the finer ones have a plainer stand-in from across the square
	for n in w.find_children("*_near", "Node3D", true, false):
		_each_geo(n, func(gi): gi.visibility_range_end = 26.0)
	for n in w.find_children("*_lodn*", "Node3D", true, false):
		_each_geo(n, func(gi): gi.visibility_range_end = 10.0)
	for n in w.find_children("*_lodf*", "Node3D", true, false):
		_each_geo(n, func(gi): gi.visibility_range_begin = 10.0)
	for i in int(data.clouds):
		var c: Node3D = by_name.get("cloud_%d" % i)
		if c == null: continue
		clouds.append(c)
		for gi in [c] + c.find_children("*", "GeometryInstance3D", true, false):
			if gi is GeometryInstance3D: gi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	door_leaf = by_name.get("door_leaf")
	if door_leaf: door_base = door_leaf.basis
	cat_head = by_name.get("cat_head")
	if cat_head: cat_base = cat_head.basis
	sails = by_name.get("sails")
	if sails: sails_base = sails.basis
	for i in int(data.chickens):
		var h: Node3D = by_name.get("hen_%d" % i)
		if h: hens.append({ "node": h, "tgt": h.position, "wait": rng.randf() * 3.0, "peck": 0.0, "yaw": h.rotation.y })
	_door_fx()
	_work_fx()
	_people()


## Nobody walks inside anybody: whoever is walking is eased off those they meet (those at their work stay put).
func _apart(dt: float) -> void:
	for i in npcs.size():
		var a: Dictionary = npcs[i]
		if a.spec.route != null:
			for o in extra:
				if not is_instance_valid(o) or not o.visible: continue
				var ex: float = a.pos.x - o.position.x
				var ez: float = a.pos.z - o.position.z
				var el := sqrt(ex * ex + ez * ez)
				if el < 0.7 and el > 0.001: a.pos = _keep_out(a.pos + Vector3(ex / el, 0, ez / el) * (0.7 - el) * (1.0 - exp(-10.0 * dt)), 0.25)
		for j in range(i + 1, npcs.size()):
			var b: Dictionary = npcs[j]
			var dx: float = b.pos.x - a.pos.x
			var dz: float = b.pos.z - a.pos.z
			if absf(dx) > 0.7 or absf(dz) > 0.7: continue
			var d := sqrt(dx * dx + dz * dz)
			var need := 0.5 if a.spec.kid and b.spec.kid else 0.64
			if main.dev_auto and d < 0.4 and (not near_seen.has([i, j]) or d < near_seen[[i, j]] - 0.04):
				near_seen[[i, j]] = d
				print("TOWN NEAR %s+%s %.2f" % [a.job, b.job, d])
			if d >= need: continue
			var fa: bool = a.spec.route == null
			var fb: bool = b.spec.route == null
			if fa and fb: continue
			if d < 0.001:
				dx = 0.01
				d = 0.01
			var push := (need - d) * (1.0 - exp(-18.0 * dt))
			var ka := 0.0 if fa else (1.0 if fb else 0.5)
			if not fa: a.pos = _keep_out(a.pos - Vector3(dx / d, 0, dz / d) * push * ka, 0.25)
			if not fb: b.pos = _keep_out(b.pos + Vector3(dx / d, 0, dz / d) * push * (1.0 - ka), 0.25)


func _each_geo(n: Node, f: Callable) -> void:
	for gi in [n] + n.find_children("*", "GeometryInstance3D", true, false):
		if gi is GeometryInstance3D: f.call(gi)


# --------------------------------------------------------------- the townsfolk --
func _people() -> void:
	var pg: Node3D = load("res://assets/people.glb").instantiate()
	add_child(pg)
	main.voxelize(pg, main.grain_mat)
	var list: Array = data.npcs
	for i in list.size():
		var spec: Dictionary = list[i]
		var root: Node3D = pg.find_child("person_%d" % i, true, false)
		if root == null: continue
		var P := {}
		var F := {}
		for part in spec.parts:
			P[part] = root.find_child("p%d_%s" % [i, part], true, false)
			F[part] = root.find_child("p%d_%s__frame" % [i, part], true, false)
		var n := {
			"root": root, "P": P, "F": F, "spec": spec, "job": String(spec.job), "hips_y": (F.hips as Node3D).position.y,
			"pos": Vector3.ZERO, "yaw": 0.0, "i": 0, "wait": 0.0, "phase": rng.randf() * TAU, "t": rng.randf() * 10.0,
			"head": 0.0, "bubble": null, "bubble_t": 0.0, "call_t": 4.0 + rng.randf() * 8.0, "line": 0, "stuck": 0.0, "last": Vector3.ZERO,
			"strike": false, "attend": 0.0, "glance": 0.0, "gap": 2.0 + rng.randf() * 12.0,
		}
		if spec.at != null:
			n.pos = Vector3(spec.at[0], 0, spec.at[1])
			n.yaw = float(spec.at[2])
		elif spec.route != null:
			var r0: Array = spec.route[0]
			n.pos = Vector3(r0[0], 0, r0[1])
			if spec.route.size() > 1:
				var r1: Array = spec.route[1]
				n.yaw = atan2(r1[0] - r0[0], r1[1] - r0[1])
			n.i = 1
		n.home_yaw = n.yaw
		root.position = n.pos
		root.rotation.y = n.yaw
		npcs.append(n)


## One townsperson's turn: walk their way, or work at their job; they mind her only when she has spoken to them.
func _npc(n: Dictionary, dt: float, her: Vector3) -> void:
	n.t += dt
	var job: String = n.job
	var spec: Dictionary = n.spec
	var E := {}
	var moving := 0.0
	var run := job == "run"
	var to_her := Vector2(her.x - n.pos.x, her.z - n.pos.z)
	var near := to_her.length()
	# walking a route
	if spec.route != null:
		var route: Array = spec.route
		if n.wait > 0.0:
			n.wait -= dt
		else:
			var tgt_a: Array = route[n.i]
			var tgt := Vector3(tgt_a[0], 0, tgt_a[1])
			var d := Vector2(tgt.x - n.pos.x, tgt.z - n.pos.z)
			var speed := 2.6 if run else (0.55 if job == "sweep" else (0.95 if spec.slow or job == "carry" else 1.25))
			var ahead := Vector2(sin(n.yaw), cos(n.yaw))
			var blocked := near < 0.95 and to_her.normalized().dot(ahead) > 0.5     # she's in the way: wait
			if d.length() < 0.25:
				n.wait = float(tgt_a[2])
				n.i = (n.i + 1) % route.size()
				n.stuck = 0.0
			elif not blocked:
				var want := atan2(d.x, d.y)
				# others in the way: pass on the right, or hang back until there's room
				var fw := d.normalized()
				var swerve := 0.0
				var slow := 1.0
				for o in npcs:
					if o == n or not (o.root as Node3D).visible: continue
					var to := Vector2(o.pos.x - n.pos.x, o.pos.z - n.pos.z)
					var ol := to.length()
					if ol > 1.5 or ol < 0.001 or d.length() < ol - 0.4: continue
					var off := to.x * fw.y - to.y * fw.x
					if to.dot(fw) < 0.0 or absf(off) > 0.66: continue
					var k := clampf(1.0 - (ol - 0.5) / 1.0, 0.0, 1.0)
					swerve += (-1.0 if off >= -0.04 else 1.0) * k * 1.15
					if ol < 0.75: slow = minf(slow, 0.5)
				for o in extra:
					if not is_instance_valid(o) or not o.visible: continue
					var to := Vector2(o.position.x - n.pos.x, o.position.z - n.pos.z)
					var ol := to.length()
					if ol > 1.9 or ol < 0.001: continue
					var off := to.x * fw.y - to.y * fw.x
					if to.dot(fw) < 0.0 or absf(off) > 0.8: continue
					swerve += (-1.0 if off >= -0.04 else 1.0) * clampf(1.0 - (ol - 0.5) / 1.4, 0.0, 1.0) * 1.3
				want += -clampf(swerve, -1.2, 1.2)
				speed *= slow
				n.yaw = lerp_angle(n.yaw, want, 1.0 - exp(-(9.0 if run else 6.0) * dt))
				if swerve != 0.0: d = Vector2(sin(want), cos(want)) * d.length()
				var step := minf(speed * dt, d.length())
				var dir := Vector2(sin(n.yaw), cos(n.yaw)).lerp(d.normalized(), 0.5).normalized()
				n.pos += Vector3(dir.x, 0, dir.y) * step
				n.pos = _keep_out(n.pos, 0.25)
				moving = speed
				n.phase += step / (0.55 if spec.kid else 0.75) * PI
				# stuck against something for a while: on to the next point
				n.stuck += dt
				if n.stuck > 2.0:
					if n.pos.distance_to(n.last) < 0.15: n.i = (n.i + 1) % route.size()
					n.last = n.pos
					n.stuck = 0.0
	n.root.position = n.pos
	# the gait
	var amt := clampf(moving / 1.2, 0.0, 1.0)
	if moving > 0.0:
		var ph: float = n.phase
		var sw := sin(ph)
		var k := (1.25 if run else 1.0) * (0.6 if spec.get("dress", false) else 1.0)   # (a skirt takes shorter steps)
		E.thighL = Vector3(-sw * 0.5 * k, 0, 0)
		E.thighR = Vector3(sw * 0.5 * k, 0, 0)
		E.shinL = Vector3(maxf(0.0, cos(ph)) * 0.9 * k, 0, 0)
		E.shinR = Vector3(maxf(0.0, -cos(ph)) * 0.9 * k, 0, 0)
		E.uArmL = Vector3(sw * 0.45 * k, 0, 0.08)
		E.uArmR = Vector3(-sw * 0.45 * k, 0, -0.08)
		E.fArmL = Vector3(-0.2 - (0.9 if run else 0.0), 0, 0)
		E.fArmR = Vector3(-0.2 - (0.9 if run else 0.0), 0, 0)
		E.torso = Vector3(0.18 if run else 0.04, sw * 0.08, 0)
		(n.F.hips as Node3D).position.y = n.hips_y + absf(cos(ph)) * (0.05 if run else 0.025) - 0.02
	else:
		var br := sin(n.t * 1.6) * 0.02
		E.torso = Vector3(br, 0, 0)
		E.uArmL = Vector3(0, 0, 0.06)
		E.uArmR = Vector3(0, 0, -0.06)
		(n.F.hips as Node3D).position.y = n.hips_y
	# the work
	var busy := false
	match job:
		"knead":
			busy = true
			var k := sin(n.t * 4.0)
			E.torso = Vector3(0.32 + k * 0.05, 0, 0)
			E.uArmL = Vector3(-0.95 - k * 0.12, 0, 0.12)
			E.uArmR = Vector3(-0.95 + k * 0.12, 0, -0.12)
			E.fArmL = Vector3(-0.45 + k * 0.2, 0, 0)
			E.fArmR = Vector3(-0.45 - k * 0.2, 0, 0)
			E.head = Vector3(0.25, 0, 0)
		"hammer":
			busy = true
			var p := fmod(n.t, 1.15) / 1.15
			var up := _ease(clampf(p / 0.62, 0.0, 1.0))
			var down := _ease(clampf((p - 0.62) / 0.1, 0.0, 1.0))
			n.swing = up if p < 0.62 else 1.0 - down            # 0: on the iron, 1: the hammer raised (see _hold)
			E.torso = Vector3(0.32 - 0.12 * float(n.swing), -0.1 * float(n.swing), 0)
			E.head = Vector3(0.22, 0, 0)
			var strike := p > 0.7 and p < 0.78
			if strike and not n.strike: _spark_at((n.root as Node3D).position + Vector3(sin(n.yaw), 0, cos(n.yaw)) * 0.62 + Vector3(0, 0.92, 0))
			n.strike = strike
		"chop":
			busy = true
			var p := fmod(n.t, 1.8) / 1.8
			var up := _ease(clampf(p / 0.6, 0.0, 1.0))
			var down := _ease(clampf((p - 0.6) / 0.12, 0.0, 1.0))
			n.swing = up if p < 0.62 else 1.0 - down            # 0: the axe in the wood, 1: up over the shoulder (see _hold)
			E.torso = Vector3(0.45 - 0.55 * float(n.swing), 0, 0)
			E.head = Vector3(0.2, 0, 0)
			var strike := p > 0.7 and p < 0.78
			if strike and not n.strike: _chips_at((n.root as Node3D).position + Vector3(sin(n.yaw), 0, cos(n.yaw)) * 0.76 + Vector3(0, 0.74, 0))
			n.strike = strike
		"fold":
			busy = true
			var k := sin(n.t * 2.2)
			E.uArmL = Vector3(-0.9, 0, 0.2 + k * 0.3)
			E.uArmR = Vector3(-0.9, 0, -0.2 - k * 0.3)
			E.fArmL = Vector3(-0.5, 0, 0)
			E.fArmR = Vector3(-0.5, 0, 0)
			E.torso = Vector3(0.2, 0, 0)
			E.head = Vector3(0.2, 0, 0)
		"strum":
			busy = true
			E.torso = Vector3(0.02, sin(n.t * 1.1) * 0.1, sin(n.t * 2.2) * 0.04)
			E.head = Vector3(0.1 + sin(n.t * 2.2) * 0.07, 0.15, sin(n.t * 1.1) * 0.1)      # (the arms: see _hold)
		"read":
			busy = true
			var turn := fmod(n.t, 7.0) > 6.3
			E.uArmL = Vector3(-0.5, 0, 0.15)
			E.uArmR = Vector3(-0.5 - (0.3 if turn else 0.0), 0, -0.15)
			E.fArmL = Vector3(-1.25, 0, 0)
			E.fArmR = Vector3(-1.25 - (0.3 if turn else 0.0), 0, 0)
			E.head = Vector3(0.38, 0, 0)
		"sit":
			busy = true
			E.thighL = Vector3(-1.5, 0, 0.06)
			E.thighR = Vector3(-1.5, 0, -0.06)
			E.shinL = Vector3(1.45, 0, 0)
			E.shinR = Vector3(1.45, 0, 0)
			(n.F.hips as Node3D).position.y = 0.5 + float(spec.get("seat", 2.0)) * float(spec.s) - 0.02
			var toss := fmod(n.t, 5.0) > 4.4
			E.uArmR = Vector3(-0.7 - (0.6 if toss else 0.0), 0, -0.2)
			E.fArmR = Vector3(-0.6, 0, 0)
			E.uArmL = Vector3(-0.35, 0, 0.1)
			E.fArmL = Vector3(-0.9, 0, 0)
			E.torso = Vector3(0.12, 0, 0)
			E.head = Vector3(0.1, sin(n.t * 0.4) * 0.4, 0)
		"hawk":
			var p := fmod(n.t, 9.0)
			if p > 7.2:                                     # calling out, a hand up
				E.uArmR = Vector3(-1.2, 0, -0.9 - sin(n.t * 7.0) * 0.15)
				E.fArmR = Vector3(-0.8, 0, 0)
				E.head = Vector3(-0.1, 0, 0)
			else:
				E.uArmL = Vector3(-0.3, 0, 0.1)
				E.uArmR = Vector3(-0.3, 0, -0.1)
				E.fArmL = Vector3(-1.1, 0, 0)
				E.fArmR = Vector3(-1.1, 0, 0)
				E.head = Vector3(0.05, sin(n.t * 0.5) * 0.5, 0)
		"sweep":
			if moving > 0.0 or n.wait > 0.0:
				E.torso = Vector3(0.22, sin(n.t * 2.6) * 0.16, 0)
				E.head = Vector3(0.2, 0, 0)
		"tray":
			E.uArmL = Vector3(-0.55, 0, 0.05)
			E.uArmR = Vector3(-0.55, 0, -0.05)
			E.fArmL = Vector3(-1.0, 0, 0)
			E.fArmR = Vector3(-1.0, 0, 0)
		"carry":
			E.uArmL = Vector3(0, 0, 0.15)
			E.uArmR = Vector3(0, 0, -0.15)
			E.fArmL = Vector3(0, 0, 0)
			E.fArmR = Vector3(0, 0, 0)
		"sack":
			E.uArmR = Vector3(-2.7, 0, -0.35)
			E.fArmR = Vector3(-1.6, 0, 0)
		"patrol":
			E.uArmL = (E.uArmL as Vector3) * Vector3(0.7, 1, 1)       # (the right hand keeps the spear upright: see _hold)
		"shop":
			if moving == 0.0 and n.wait > 0.0:               # at a stall: weighing things up, a gesture now and then
				var gst := fmod(n.t, 4.0) > 3.2
				E.uArmR = Vector3(-0.8 if gst else -0.1, 0, -0.1)
				E.fArmR = Vector3(-0.9 if gst else -0.2, 0, 0)
				E.head = Vector3(0.18, sin(n.t * 0.7) * 0.3, 0)
	# whom they mind: their own business. Spoken to, they give her their attention, and a moment more when she's done;
	# otherwise it's a passing glance now and then, if she happens to be close by and before them
	var look := 0.0
	var bearing := wrapf(atan2(to_her.x, to_her.y) - n.yaw, -PI, PI)
	var heed: bool = n.attend > 0.0
	if heed:
		n.attend -= dt
		if near > 4.0: n.attend = minf(n.attend, 0.6)            # she has walked off
		if not (job in ["sit", "hammer", "chop"]) and (moving == 0.0):      # turn to face her (those at work only turn their heads)
			var turn := bearing if not busy or absf(bearing) > 1.0 else 0.0
			if turn != 0.0: n.yaw = lerp_angle(n.yaw, n.yaw + turn, 1.0 - exp(-3.5 * dt))
		look = clampf(bearing, -1.15, 1.15)
		n.glance = -2.0 - rng.randf() * 4.0
	else:
		n.glance -= dt
		if n.glance > 0.0: look = clampf(bearing, -0.75, 0.75)
		elif n.glance < -n.gap:
			n.gap = 7.0 + rng.randf() * 14.0
			n.glance = (0.6 + rng.randf() * 0.6) if near < 2.6 and absf(bearing) < 1.2 and not busy else 0.0
		if spec.route == null and job != "sit": n.yaw = lerp_angle(n.yaw, n.home_yaw, 1.0 - exp(-2.5 * dt))      # back to the work
	n.head = lerpf(n.head, look, 1.0 - exp(-(5.0 if heed else 3.0) * dt))
	var hv: Vector3 = E.get("head", Vector3.ZERO)
	E.head = Vector3(hv.x * (1.0 - absf(n.head) * 0.5), hv.y * (1.0 - minf(1.0, absf(n.head) * 2.0)) + n.head, hv.z)
	(n.root as Node3D).rotation.y = n.yaw
	# put the pose on: every joint eases to its target
	var ease_k := 1.0 - exp(-14.0 * dt)
	for part in ["torso", "head", "uArmL", "uArmR", "fArmL", "fArmR", "thighL", "thighR", "shinL", "shinR"]:
		var jn: Node3D = n.P.get(part)
		if jn == null: continue
		var e: Vector3 = E.get(part, Vector3.ZERO)
		if job in ["chop", "strum", "hammer", "sweep"] and "Arm" in part or job == "patrol" and part in ["uArmR", "fArmR"]: continue
		jn.quaternion = jn.quaternion.slerp(Quaternion(Basis.from_euler(e, EULER_ORDER_XYZ)), ease_k)
	if job in ["chop", "strum", "patrol", "hammer", "sweep"]: _hold(n, moving, dt)
	# sellers call out their wares when she's about
	if spec.call:
		n.call_t -= dt
		if n.call_t <= 0.0:
			n.call_t = 9.0 + rng.randf() * 8.0
			if near < 16.0: say(n, spec.lines[rng.randi_range(0, spec.lines.size() - 1)])
	# the speech bubble fades
	if n.bubble != null:
		n.bubble_t -= dt
		var b: Label3D = n.bubble
		b.modulate.a = clampf(n.bubble_t / 0.4, 0.0, 1.0)
		b.outline_modulate.a = b.modulate.a
		if n.bubble_t <= 0.0:
			b.queue_free()
			n.bubble = null


## Things held in both hands. The axe swings on its own arc, the lute rests across the body, and each arm reaches to it:
## the hands stay on the handle, on the strings and the neck, whatever the body does.
func _hold(n: Dictionary, moving: float, dt: float) -> void:
	var torso: Node3D = n.P.torso
	var root: Node3D = n.root
	var to_torso := torso.global_transform.affine_inverse()
	var vs: float = n.spec.s
	if n.job == "chop":
		var axe: Node3D = n.P.get("axe")
		if axe == null: return
		var u: float = n.get("swing", 0.0)
		var sh: Vector3 = ((n.F.uArmL as Node3D).position + (n.F.uArmR as Node3D).position) * 0.5
		var c: Vector3 = root.global_transform.affine_inverse() * (torso.global_transform * sh)
		var a := deg_to_rad(lerpf(-48.0, 72.0, u))              # where the hands are, round the shoulders
		var b := deg_to_rad(lerpf(-32.0, 138.0, u))             # which way the handle points: at the wood .. back over the shoulder
		axe.global_transform = root.global_transform * Transform3D(Basis(Vector3.RIGHT, -b), c + Vector3(0, sin(a), cos(a)) * 0.41)
		_reach(n, "R", to_torso * (axe.global_transform * Vector3.ZERO), Vector3(-1, -0.35, 0))
		_reach(n, "L", to_torso * (axe.global_transform * Vector3(0, 0, -7.0 * vs)), Vector3(1, -0.35, 0))
	elif n.job == "hammer":
		# the tongs hold the iron on the anvil, the hammer comes down on it
		var ham: Node3D = n.P.get("hammer")
		var tg: Node3D = n.P.get("tongs")
		if ham == null or tg == null: return
		var u: float = n.get("swing", 0.0)
		var b := deg_to_rad(lerpf(-4.0, 104.0, u))
		ham.global_transform = root.global_transform * Transform3D(Basis(Vector3.UP, -0.12) * Basis(Vector3.RIGHT, -b), Vector3(-0.1, 1.0, 0.31).lerp(Vector3(-0.27, 1.5, 0.2), u))
		_reach(n, "R", to_torso * ham.global_transform.origin, Vector3(-0.9, -0.6, -0.3))
		var grip := Vector3(0.31, 1.0, 0.36)
		var jaw := Vector3(0.17, 0.9, 0.62)
		tg.global_transform = root.global_transform * Transform3D(Basis.looking_at(grip - jaw, Vector3.UP), grip)
		_reach(n, "L", to_torso * tg.global_transform.origin, Vector3(0.8, -0.7, -0.3))
	elif n.job == "sweep":
		# both hands on the broom, its foot swinging across the flags before her
		var br: Node3D = n.P.get("broom")
		if br == null: return
		var k := sin(n.t * 2.6)
		var foot := Vector3(k * 0.3, 0.01 + maxf(0.0, cos(n.t * 2.6)) * 0.03, 0.52 - absf(k) * 0.06)
		var up := (Vector3(-0.1 + k * 0.05, 1.35, 0.1) - foot).normalized()
		var side := up.cross(Vector3.BACK).normalized()
		br.global_transform = root.global_transform * Transform3D(Basis(side, up, side.cross(up)), foot)
		_reach(n, "R", to_torso * (br.global_transform * Vector3(0, 47.0 * vs, 0)), Vector3(-1, -0.5, -0.3))
		_reach(n, "L", to_torso * (br.global_transform * Vector3(0, 36.0 * vs, 0)), Vector3(1, -0.5, -0.3))
	elif n.job == "patrol":
		# upright at his side, a forearm's reach before him: carried clear of the ground with each stride, grounded when he stands
		var spear: Node3D = n.P.get("spear")
		if spear == null: return
		n.carry = lerpf(n.get("carry", 0.0), 1.0 if moving > 0.0 else 0.0, 1.0 - exp(-6.0 * dt))
		var side: float = (n.F.uArmR as Node3D).position.x - 2.5 * vs
		var bob: float = n.carry * (0.07 + absf(cos(n.phase)) * 0.02)
		var tilt: float = n.carry * 0.07 + (1.0 - n.carry) * 0.02
		spear.global_transform = root.global_transform * Transform3D(Basis(Vector3.RIGHT, tilt) * Basis(Vector3.BACK, 0.02), Vector3(side, 44.0 * vs + bob, 0.15))
		_reach(n, "R", to_torso * spear.global_transform.origin, Vector3(-0.35, -1, -0.5))
	else:
		var lute: Node3D = n.P.get("lute")
		if lute == null: return
		lute.basis = Basis(Vector3.RIGHT, -0.12) * Basis(Vector3.BACK, -1.08 + sin(n.t * 1.1) * 0.03)
		var chord: float = [15.0, 12.0, 17.0, 13.5][int(n.t / 1.7) % 4]
		n.fret = lerpf(n.get("fret", chord), chord, 0.15)
		var to_lute := to_torso * lute.global_transform
		var frets: Node3D = n.P.get("frets")
		if frets: frets.position = Vector3(0, n.fret, 0) * vs
		_reach(n, "L", to_lute * (Vector3(1.0, n.fret, -1.4) * vs), Vector3(0.6, -1, 0.1))            # the palm behind the neck
		_reach(n, "R", to_lute * (Vector3(sin(n.t * 10.0) * 1.6, -2.0, 5.2) * vs), Vector3(-0.55, 0.15, 1.0))      # over the body, clear of its face


## Reach: bend one arm so its fist comes to a point (in the torso's space), the elbow out toward `pole`.
func _reach(n: Dictionary, side: String, tgt: Vector3, pole: Vector3) -> void:
	var a: float = n.spec.ua
	var b: float = n.spec.fa
	var d: Vector3 = tgt - (n.F["uArm" + side] as Node3D).position
	var l := clampf(d.length(), absf(a - b) + 0.01, a + b - 0.004)
	var bend := PI - acos(clampf((a * a + b * b - l * l) / (2.0 * a * b), -1.0, 1.0))
	var u1 := Vector3(0, -a - b * cos(bend), b * sin(bend)).normalized()
	var e := Vector3(0, -a, 0)
	var p1 := (e - u1 * e.dot(u1)).normalized()
	var u2 := d.normalized()
	var p2 := (pole - u2 * pole.dot(u2)).normalized()
	(n.P["uArm" + side] as Node3D).basis = Basis(u2, p2, u2.cross(p2)) * Basis(u1, p1, u1.cross(p1)).transposed()
	(n.P["fArm" + side] as Node3D).basis = Basis(Vector3.RIGHT, -bend)


func _ease(x: float) -> float:
	return x * x * (3.0 - 2.0 * x)


## A speech bubble over someone's head.
func say(n: Dictionary, text: String) -> void:
	if n.bubble != null: (n.bubble as Label3D).queue_free()
	var b := Label3D.new()
	b.text = text
	b.font = bubble_font
	b.font_size = 44
	b.pixel_size = 0.0034
	b.outline_size = 14
	b.modulate = Color("fff6e6")
	b.outline_modulate = Color(0.16, 0.11, 0.2, 1)
	b.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	b.width = 900.0
	b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	b.vertical_alignment = VERTICAL_ALIGNMENT_BOTTOM
	var sit_drop: float = (n.hips_y - (0.5 + float(n.spec.get("seat", 2.0)) * float(n.spec.s))) if n.job == "sit" else 0.0
	b.position = Vector3(0, float(n.spec.get("top", 1.8)) + 0.2 - sit_drop, 0)
	b.no_depth_test = true
	b.render_priority = 10
	(n.root as Node3D).add_child(b)
	n.bubble = b
	n.bubble_t = 4.0 + text.length() * 0.03


## G near someone: they turn to her and say something (the next of their lines).
func talk(her: Vector3) -> bool:
	var best = null
	var bd := 2.4
	for n in npcs:
		var d := Vector2(her.x - n.pos.x, her.z - n.pos.z).length()
		if d < bd:
			bd = d
			best = n
	if best == null: return false
	var lines: Array = best.spec.lines
	say(best, lines[best.line % lines.size()])
	best.line += 1
	best.attend = best.bubble_t + 1.5                        # they attend to her while they speak, and a moment after
	if best.spec.route != null: best.wait = maxf(best.wait, best.attend)      # (and stop to talk)
	return true


func near_person(her: Vector3) -> bool:
	for n in npcs:
		if Vector2(her.x - n.pos.x, her.z - n.pos.z).length() < 2.4: return true
	return false


# ------------------------------------------------------------ the little things --
func _work_fx() -> void:
	# sparks off the anvil, chips off the chopping block: one burst per strike
	sparks = _burst(18, Color("ffd27a"), Color("ff7a2a"), 2.2, 0.03, true)
	chips = _burst(10, Color("e8c890"), Color("a8783e"), 1.6, 0.05, false)


func _burst(amount: int, a: Color, b: Color, speed: float, size: float, glow: bool) -> GPUParticles3D:
	var p := GPUParticles3D.new()
	p.amount = amount
	p.lifetime = 0.7
	p.one_shot = true
	p.explosiveness = 1.0
	p.emitting = false
	var pm := ParticleProcessMaterial.new()
	pm.direction = Vector3(0, 1, 0)
	pm.spread = 70.0
	pm.initial_velocity_min = speed * 0.5
	pm.initial_velocity_max = speed
	pm.gravity = Vector3(0, -6, 0)
	var gr := Gradient.new()
	gr.set_color(0, a)
	gr.set_color(1, b)
	var gt := GradientTexture1D.new()
	gt.gradient = gr
	pm.color_initial_ramp = gt
	p.process_material = pm
	var m := BoxMesh.new()
	m.size = Vector3.ONE * size
	var mat := StandardMaterial3D.new()
	mat.vertex_color_use_as_albedo = true
	if glow:
		mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		mat.albedo_color = Color(1.5, 1.5, 1.5)
	m.material = mat
	p.draw_pass_1 = m
	p.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(p)
	return p


func _spark_at(p: Vector3) -> void:
	sparks.position = p
	sparks.restart()


func _chips_at(p: Vector3) -> void:
	chips.position = p
	chips.restart()


func _door_fx() -> void:
	var d: Dictionary = data.door
	door_light = OmniLight3D.new()
	door_light.position = Vector3(d.x, 0.25, d.z)
	door_light.light_color = Color("ff7ac0")
	door_light.omni_range = 3.0
	door_light.light_energy = 0.0
	add_child(door_light)
	door_sparks = GPUParticles3D.new()
	door_sparks.amount = 24
	door_sparks.lifetime = 2.2
	door_sparks.position = Vector3(d.x, 0.05, d.z)
	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	pm.emission_box_extents = Vector3(0.35, 0.02, 0.5)
	pm.direction = Vector3(0, 1, 0)
	pm.spread = 15.0
	pm.initial_velocity_min = 0.2
	pm.initial_velocity_max = 0.6
	pm.gravity = Vector3.ZERO
	var c := Curve.new()
	c.add_point(Vector2(0, 0))
	c.add_point(Vector2(0.2, 1))
	c.add_point(Vector2(1, 0))
	var ct := CurveTexture.new()
	ct.curve = c
	pm.scale_curve = ct
	var gr := Gradient.new()
	gr.set_color(0, Color("ff6fb8"))
	gr.set_color(1, Color("c194ff"))
	var gt := GradientTexture1D.new()
	gt.gradient = gr
	pm.color_initial_ramp = gt
	door_sparks.process_material = pm
	var m := BoxMesh.new()
	m.size = Vector3.ONE * 0.03
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.vertex_color_use_as_albedo = true
	mat.albedo_color = Color(1.4, 1.4, 1.4)
	m.material = mat
	door_sparks.draw_pass_1 = m
	door_sparks.amount_ratio = 0.25
	add_child(door_sparks)


func near_door(her: Vector3) -> bool:
	return Vector2(her.x - data.door.x, her.z - data.door.z).length() < 1.5


func update(dt: float, her: Vector3) -> void:
	t += dt
	if main.light_off.has("lineup"):                      # (dev: everyone stood in rows, to look them over)
		for i in npcs.size():
			npcs[i].root.position = Vector3(-4.0 + (i % 11) * 0.8, 0, 6.0 + (i / 11) * 1.6)
			npcs[i].root.rotation.y = PI if main.light_off.has("backs") else 0.0
		return
	for n in npcs: _npc(n, dt, her)
	_apart(dt)
	# the door: its hatch swings up, the light below brightens, a few sparkles always slip out through the cracks
	if door_leaf:
		var a := _ease(door_open) * 1.85
		door_leaf.basis = door_base * Basis(Vector3.RIGHT, -a)
	var near := Vector2(her.x - data.door.x, her.z - data.door.z).length()
	door_light.light_energy = 0.25 + 0.35 * clampf(1.0 - near / 4.0, 0.0, 1.0) + door_open * 2.5
	door_sparks.amount_ratio = 0.25 + door_open * 0.75
	# the cat watches her
	if cat_head:
		var cp := cat_head.global_position
		var want := 0.0
		if near < 7.0:
			want = clampf(wrapf(atan2(her.x - cp.x, her.z - cp.z) - (cat_head.get_parent() as Node3D).global_rotation.y - 0.9, -PI, PI), -1.3, 1.3)
		var cur := cat_head.get_meta("look", 0.0) as float
		cur = lerpf(cur, want + sin(t * 0.7) * 0.08, 1.0 - exp(-4.0 * dt))
		cat_head.set_meta("look", cur)
		cat_head.basis = Basis(Vector3.UP, cur) * cat_base
	# the windmill
	if sails: sails.basis = sails_base * Basis(Vector3(0, 0, 1), t * 0.5)
	# clouds drift
	for c in clouds:
		c.position.x += dt * 1.2
		if c.position.x > 200.0: c.position.x -= 400.0
	# the hens: peck about, wander a little, scatter if she comes close
	for h in hens:
		var node: Node3D = h.node
		var hp := node.position
		var dh := Vector2(hp.x - her.x, hp.z - her.z)
		if dh.length() < 1.6:
			var away := dh.normalized() * 2.5
			h.tgt = _keep_out(Vector3(hp.x + away.x, 0, hp.z + away.y), 0.15)
			h.wait = 0.0
		var d := Vector2(h.tgt.x - hp.x, h.tgt.z - hp.z)
		if d.length() > 0.08:
			var fast := dh.length() < 2.4
			h.yaw = lerp_angle(h.yaw, atan2(d.x, d.y), 1.0 - exp(-8.0 * dt))
			var step := minf((2.2 if fast else 0.5) * dt, d.length())
			hp += Vector3(sin(h.yaw), 0, cos(h.yaw)) * step
			hp.y = absf(sin(t * 18.0)) * 0.03
			node.rotation = Vector3(0, h.yaw, 0)
		else:
			h.wait -= dt
			h.peck += dt
			hp.y = 0.0
			node.rotation = Vector3(0.5 if fmod(h.peck, 1.3) > 0.9 else 0.0, h.yaw, 0)
			if h.wait <= 0.0:
				h.wait = 1.5 + rng.randf() * 4.0
				h.tgt = Vector3(clampf(hp.x + rng.randf_range(-1.5, 1.5), -2.4, 2.4), 0, clampf(hp.z + rng.randf_range(-1.5, 1.5), 16.5, 26.0))
		node.position = hp


# ------------------------------------------------------------------ walking --
## Where she may stand: out of the scenery's circles and the townsfolk, inside the streets.
func collide(p: Vector3, r: float) -> Vector3:
	p = _keep_out(p, r)
	for n in npcs:
		if n.job == "sit": continue
		var dx: float = p.x - n.pos.x
		var dz: float = p.z - n.pos.z
		var d := sqrt(dx * dx + dz * dz)
		var m := NPC_R + r
		if d < m and d > 0.00001:
			p.x = n.pos.x + dx / d * m
			p.z = n.pos.z + dz / d * m
	return _in_walk(p, r)


func _keep_out(p: Vector3, r: float) -> Vector3:
	for c in colliders:
		var dx: float = p.x - c[0]
		var dz: float = p.z - c[1]
		var d := sqrt(dx * dx + dz * dz)
		var m: float = c[2] + r
		if d < m and d > 0.00001:
			p.x = c[0] + dx / d * m
			p.z = c[1] + dz / d * m
	return _in_walk(p, r)


## The streets are rectangles that overlap at the joins: stay inside one of them.
func _in_walk(p: Vector3, r: float) -> Vector3:
	var best := p
	var bd := INF
	for w in walk:
		var x0: float = w[0] + r
		var z0: float = w[1] + r
		var x1: float = w[2] - r
		var z1: float = w[3] - r
		if p.x >= x0 and p.x <= x1 and p.z >= z0 and p.z <= z1: return p
		var q := Vector3(clampf(p.x, x0, x1), p.y, clampf(p.z, z0, z1))
		var d := Vector2(q.x - p.x, q.z - p.z).length_squared()
		if d < bd:
			bd = d
			best = q
	return best


func seats() -> Array:
	return data.seats
