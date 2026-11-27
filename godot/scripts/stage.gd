extends Node3D
## A place of the story (baked from js/farm.js or js/academy.js): its ground and scenery, lamps, doors, and what the game
## needs to walk about in it: floors and stairs one above another, walls, and the paths people take.

var main: Node3D
var id := ""
var data: Dictionary
var by_name := {}
var glow: BaseMaterial3D                # what shines of its own accord here (put out with the lamps)
var glow_out := 0.0
var floors: Array = []
var ramps: Array = []
var blocks: Array = []
var slabs: Array = []
var colliders: Array = []
var walk: Array = []
var rock := {}                         # the cliffs, as a map of squares: 1, solid to a body; 2, to the camera
var rock_m := PackedByteArray()
var doors := {}                      # id -> { nodes, bases, open, want, hold, block, locked, ... }
var clouds: Array = []
var hens: Array = []
var lamps: Array = []                # { light, e, name }
var nodes: Array = []                # the paths' nodes
var links: Array = []                # per node: [[other, length, door]]
var node_id := {}
var actors: Array = []               # people to keep out of each other's way
var t := 0.0
var astro: Array = []
var floats: Array = []
var bell: Node3D
var clapper: Node3D
var bell_t := 99.0
var rng := RandomNumberGenerator.new()
var lamp_k := 1.0
# the swing: a pendulum hung from the bough. th is its angle (+ forward), om its speed; len from the knots to the rider's
# middle; amp > 0 while somebody pumps it to that height, else it dies away by itself
var swing := {}
const G := 9.81
var _roof: Array = []


func setup(main_node: Node3D, bake: Dictionary, place: String) -> void:
	main = main_node
	id = place
	data = bake[place]
	name = place
	rng.seed = 5
	floors = data.floors
	ramps = data.ramps
	blocks = data.blocks
	slabs = data.slabs
	colliders = data.colliders
	walk = data.walk
	if data.get("marks") is Dictionary and data.marks.has("rock"):
		var k: Dictionary = data.marks.rock
		rock = k
		rock_m.resize(int(k.nx) * int(k.nz))
		var o := 0
		for i in range(0, k.rle.size(), 2):
			for j in int(k.rle[i + 1]):
				rock_m[o] = int(k.rle[i])
				o += 1
	_ground()
	var w: Node3D = load("res://assets/%s.glb" % place).instantiate()
	add_child(w)
	glow = main.glow_mat.duplicate()
	main.voxelize(w, main.grain_mat, glow)
	for n in w.find_children("*", "Node3D", true, false): by_name[String(n.name)] = n
	for n in w.find_children("*_nc*", "Node3D", true, false): _each(n, func(g): g.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF)
	for n in w.find_children("*_near", "Node3D", true, false): _each(n, func(g):
		g.visibility_range_end = 24.0
		if place == "academy": g.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF)
	for n in w.find_children("*_lodn*", "Node3D", true, false): _each(n, func(g): g.visibility_range_end = 10.0)
	for n in w.find_children("*_lodf*", "Node3D", true, false): _each(n, func(g): g.visibility_range_begin = 10.0)
	for i in int(data.clouds):
		var c: Node3D = by_name.get("cloud_%d" % i)
		if c: clouds.append(c)
	_instances()
	_lamps()
	_doors()
	for i in int(data.hens):
		var h: Node3D = by_name.get("hen_%d" % i)
		if h: hens.append({ "node": h, "tgt": h.position, "wait": rng.randf() * 3.0, "peck": rng.randf(), "yaw": h.rotation.y, "home": data.marks.hens })
	for k in ["astro_0", "astro_1", "astro_2", "astro_s"]: if by_name.has(k): astro.append(by_name[k])
	for i in int(data.floaters):
		var f: Node3D = by_name.get("flo_%d" % i)
		if f: floats.append({ "node": f, "p": f.position, "ph": rng.randf() * TAU })
	var sw: Node3D = by_name.get("swing")
	if sw: swing = { "n": sw, "base": sw.basis, "th": 0.03, "om": 0.0, "len": 3.12, "amp": 0.0, "seat": Vector3(0, -130.5 * 0.024, 0) }
	bell = by_name.get("bell")
	clapper = by_name.get("clapper")
	nodes = data.nodes
	for k in data.nodeId: node_id[k] = int(data.nodeId[k])
	links.resize(nodes.size())
	for i in nodes.size(): links[i] = []
	for e in data.edges:
		var a := int(e[0])
		var b := int(e[1])
		var d := _np(a).distance_to(_np(b))
		if String(e[2]) == "~":
			links[a].append([b, 2.0, "~"])
		else:
			links[a].append([b, d, String(e[2])])
			links[b].append([a, d, String(e[2])])


func _each(n: Node, f: Callable) -> void:
	for g in [n] + n.find_children("*", "GeometryInstance3D", true, false):
		if g is GeometryInstance3D: f.call(g)


func _ground() -> void:
	if data.ground != null:
		var p := PlaneMesh.new()
		p.size = Vector2(data.ground.size, data.ground.size)
		var m := StandardMaterial3D.new()
		m.albedo_texture = load("res://assets/%s_ground.png" % id)
		m.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST_WITH_MIPMAPS_ANISOTROPIC
		m.roughness = 1.0
		m.specular_mode = BaseMaterial3D.SPECULAR_DISABLED
		_plane(p, m, Vector3(data.ground.x, 0, data.ground.z))
	if data.core != null:
		var p := PlaneMesh.new()
		p.size = Vector2(data.core.size, data.core.size)
		var m := ShaderMaterial.new()
		m.shader = preload("res://scripts/ground.gdshader")
		m.set_shader_parameter("tex", load("res://assets/%s_core.png" % id))
		_plane(p, m, Vector3(data.core.x, 0.004, data.core.z))
	var far := PlaneMesh.new()
	far.size = Vector2(1200, 1200)
	var fm := StandardMaterial3D.new()
	fm.albedo_color = Color.hex((int(data.farColor) << 8) | 0xff)
	fm.roughness = 1.0
	_plane(far, fm, Vector3(0, -0.06, 0))


func _plane(mesh: Mesh, m: Material, at: Vector3) -> void:
	var g := MeshInstance3D.new()
	g.mesh = mesh
	g.material_override = m
	g.position = at
	g.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(g)


func _instances() -> void:
	var list: Array = data.instances
	for i in list.size():
		var src: Node3D = by_name.get("inst_%d" % i)
		if src == null: continue
		var mi: MeshInstance3D = src if src is MeshInstance3D else src.find_children("*", "MeshInstance3D", true, false)[0]
		src.visible = false
		# in patches, so what's behind one, or far off, isn't drawn
		var cells := {}
		for e in list[i].list:
			var k := Vector2i(floori(e[0] / 9.0), floori(e[1] / 9.0))
			if not cells.has(k): cells[k] = []
			cells[k].append(e)
		for k in cells:
			var mm := MultiMesh.new()
			mm.transform_format = MultiMesh.TRANSFORM_3D
			mm.mesh = mi.mesh
			mm.instance_count = cells[k].size()
			var c := Vector3((k.x + 0.5) * 9.0, 0, (k.y + 0.5) * 9.0)
			for q in cells[k].size():
				var e: Array = cells[k][q]
				mm.set_instance_transform(q, Transform3D(Basis(Vector3.UP, e[2]).scaled(Vector3.ONE * float(e[3])), Vector3(e[0], 0, e[1]) - c))
			var mmi := MultiMeshInstance3D.new()
			mmi.multimesh = mm
			mmi.material_override = main.grain_mat
			mmi.position = c
			mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			if float(list[i].near) > 0.0: mmi.visibility_range_end = float(list[i].near)
			add_child(mmi)


func _lamps() -> void:
	for l in data.lights:
		var o := OmniLight3D.new()
		o.position = Vector3(l.p[0], l.p[1], l.p[2])
		o.light_color = Color.hex((int(l.c) << 8) | 0xff)
		o.light_energy = float(l.e)
		o.omni_range = float(l.r)
		o.omni_attenuation = 1.2
		o.shadow_enabled = false
		o.distance_fade_enabled = true
		o.distance_fade_begin = 22.0
		o.distance_fade_length = 6.0
		add_child(o)
		lamps.append({ "light": o, "e": float(l.e), "name": String(l.name) })


# ------------------------------------------------------------------ doors --
func _doors() -> void:
	for d in data.doors:
		var ns: Array = []
		var bs: Array = []
		for k in int(d.leafs):
			var n: Node3D = by_name.get("door_%s_%d" % [d.id, k])
			if n:
				ns.append(n)
				bs.append(n.basis)
		doors[d.id] = { "id": d.id, "nodes": ns, "bases": bs, "open": 1.0 if d.stay else 0.0, "want": bool(d.stay), "stay": bool(d.stay), "hold": 0.0, "block": d.block, "locked": String(d.locked), "label": String(d.label), "room": String(d.room), "pos": Vector3(d.x, d.y, d.z), "dir": String(d.dir) }


func _door_update(d: Dictionary, dt: float) -> void:
	if d.hold > 0.0: d.hold -= dt
	var goal := 1.0 if d.want or d.hold > 0.0 else 0.0
	if absf(d.open - goal) < 0.001 and d.get("set", false): return
	var was: float = d.open
	d.open = move_toward(d.open, goal, dt * 2.2)
	if was == 0.0 and d.open > 0.0: main.sfx(d.get("sfx", "door"), d.pos)
	if was > 0.0 and d.open == 0.0: main.sfx(d.get("sfx", "door_shut"), d.pos)
	var a: float = smoothstep(0.0, 1.0, d.open) * 1.8
	for i in d.nodes.size(): (d.nodes[i] as Node3D).basis = Basis(Vector3.UP, a * (1.0 if i == 0 else -1.0)) * d.bases[i]
	d.set = true


## Shut a door at once (for a scene, while the screen's dark), and keep it shut.
func shut(id: String) -> void:
	var d: Dictionary = doors[id]
	d.want = false
	d.hold = 0.0
	d.by_hand = true
	d.open = 0.0
	d.set = false


## Stand a door open at once, and keep it so.
func stand_open(id: String) -> void:
	var d: Dictionary = doors[id]
	d.want = true
	d.by_hand = true
	d.open = 1.0
	d.set = false


## How near a point is to an open door's leaf.
func leaf_gap(d: Dictionary, p: Vector3) -> float:
	if d.open < 0.05 or absf(p.y - d.pos.y) > 1.5: return INF
	var best := INF
	for n in d.nodes:
		var h: Vector3 = (n as Node3D).global_position
		var a: float = smoothstep(0.0, 1.0, d.open) * 1.8 * (1.0 if n == d.nodes[0] else -1.0)
		var c := Vector3(d.pos.x - h.x, 0, d.pos.z - h.z)
		c = c.normalized().rotated(Vector3.UP, a)
		var t := clampf((p.x - h.x) * c.x + (p.z - h.z) * c.z, 0.0, 1.1)
		best = minf(best, Vector2(p.x - h.x - c.x * t, p.z - h.z - c.z * t).length())
	return best


func near_door(p: Vector3, r := 1.35):
	var best = null
	var bd := r
	for k in doors:
		var d: Dictionary = doors[k]
		if absf(d.pos.y - p.y) > 1.0: continue
		var l := Vector2(p.x - d.pos.x, p.z - d.pos.z).length()
		if l < bd:
			bd = l
			best = d
	return best


# ---------------------------------------------------------------- walking --
## The floor under a point: the highest within a step of where one is. NAN if there's none.
func ground_y(p: Vector3) -> float:
	var best := NAN
	for f in floors:
		if p.x < f[0] or p.z < f[1] or p.x > f[2] or p.z > f[3]: continue
		var y: float = f[4]
		if y <= p.y + 0.5 and (is_nan(best) or y > best): best = y
	for r in ramps:
		if p.x < r[0] or p.z < r[1] or p.x > r[2] or p.z > r[3]: continue
		var y: float = lerpf(r[4], r[5], (p.z - r[1]) / (r[3] - r[1]))
		if y <= p.y + 0.5 and (is_nan(best) or y > best): best = y
	if floors.is_empty(): return 0.0
	return best


func _blocked(b: Array, y: float) -> bool:
	return b.size() < 6 or (float(b[4]) < y + 1.4 and float(b[5]) > y + 0.3)


## Push a point out of the walls, the things in the way and shut doors; keep it on a floor.
func collide(p: Vector3, r: float, from := Vector3.INF, skip = null, doors_ := true, people := true) -> Vector3:
	for c in colliders:
		if c.size() > 3 and (p.y + 0.3 > c[4] or p.y + 1.4 < c[3]): continue
		var dx: float = p.x - c[0]
		var dz: float = p.z - c[1]
		var m: float = c[2] + r
		if absf(dx) > m or absf(dz) > m: continue
		var d := sqrt(dx * dx + dz * dz)
		if d < m and d > 0.00001:
			p.x = c[0] + dx / d * m
			p.z = c[1] + dz / d * m
	for a in actors if people else []:
		if a == skip or not a.solid or absf(a.position.y - p.y) > 1.0: continue
		var dx: float = p.x - a.position.x
		var dz: float = p.z - a.position.z
		var m := 0.24 + r
		if absf(dx) > m or absf(dz) > m: continue
		var d := sqrt(dx * dx + dz * dz)
		if d < m and d > 0.00001:
			p.x = a.position.x + dx / d * m
			p.z = a.position.z + dz / d * m
	for b in blocks: p = _out(p, b, r)
	for k in doors if doors_ else {}:
		var d: Dictionary = doors[k]
		if d.open < 0.5: p = _out(p, d.block, r)
	if not walk.is_empty(): p = _in_walk(p, r)
	if not rock_m.is_empty(): p = _rock_out(p, r)
	if not floors.is_empty():
		var y := ground_y(p)
		if is_nan(y) or absf(y - p.y) > 0.9 and y < p.y:
			if from != Vector3.INF: return from
		else: p.y = y if y > p.y or p.y - y < 0.9 else p.y
	return p


func _out(p: Vector3, b: Array, r: float) -> Vector3:
	var x0: float = b[0] - r
	var z0: float = b[1] - r
	var x1: float = b[2] + r
	var z1: float = b[3] + r
	if p.x <= x0 or p.x >= x1 or p.z <= z0 or p.z >= z1 or not _blocked(b, p.y): return p
	var l := p.x - x0
	var rr := x1 - p.x
	var n := p.z - z0
	var s := z1 - p.z
	var m := minf(minf(l, rr), minf(n, s))
	if m == l: p.x = x0
	elif m == rr: p.x = x1
	elif m == n: p.z = z0
	else: p.z = z1
	return p


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


func _rock(i: int, j: int) -> int:
	if i < 0 or j < 0 or i >= int(rock.nx) or j >= int(rock.nz): return 0
	return rock_m[j * int(rock.nx) + i]


func rock_at(x: float, z: float) -> int: return _rock(floori((x - rock.x) / rock.c), floori((z - rock.z) / rock.c))


## Out of the rock, the shortest way, sliding along it.
func _rock_out(p: Vector3, r: float) -> Vector3:
	if p.x > 40.0: return p
	var c: float = rock.c
	if rock_at(p.x, p.z) & 1:                                       # right inside it: to the nearest clear spot
		for k in range(1, 14):
			for a in 16:
				var q := p + Vector3(cos(a * TAU / 16.0), 0, sin(a * TAU / 16.0)) * c * k
				if not (rock_at(q.x, q.z) & 1): return q
		return p
	for n in 3:
		var bd := r
		var bx := 0.0
		var bz := 0.0
		for j in range(floori((p.z - r - rock.z) / c), floori((p.z + r - rock.z) / c) + 1):
			for i in range(floori((p.x - r - rock.x) / c), floori((p.x + r - rock.x) / c) + 1):
				if not (_rock(i, j) & 1): continue
				var qx: float = clampf(p.x, rock.x + i * c, rock.x + (i + 1) * c)
				var qz: float = clampf(p.z, rock.z + j * c, rock.z + (j + 1) * c)
				var d := Vector2(p.x - qx, p.z - qz).length()
				if d < bd:
					bd = d
					bx = qx
					bz = qz
		if bd >= r - 0.0005 or bd < 0.0001: break
		p.x = bx + (p.x - bx) / bd * r
		p.z = bz + (p.z - bz) / bd * r
	return p


## Is a point inside something solid (for the camera)?
func solid(q: Vector3) -> bool:
	if q.y < 0.1: return true
	for b in blocks:
		if b.size() < 6 or b[5] - b[4] < 1.2: continue
		if q.x > b[0] - 0.1 and q.x < b[2] + 0.1 and q.z > b[1] - 0.1 and q.z < b[3] + 0.1 and q.y > b[4] and q.y < b[5]: return true
	for b in slabs:
		if q.x > b[0] and q.x < b[2] and q.z > b[1] and q.z < b[3] and q.y > b[4] - 0.12 and q.y < b[5] + 0.12: return true
	for k in doors:
		var d: Dictionary = doors[k]
		var b: Array = d.block
		if d.open < 0.4 and q.x > b[0] - 0.1 and q.x < b[2] + 0.1 and q.z > b[1] - 0.1 and q.z < b[3] + 0.1 and q.y > b[4] and q.y < b[5]: return true
	return false


## Where the camera that follows you about may not go, besides: off the trail into the cliffs, or into a standing stone.
func shut_to_cam(q: Vector3) -> bool:
	if id != "snow" or q.y > 5.5: return false
	var on_ := false
	for w in walk:
		if q.x > w[0] - 0.3 and q.x < w[2] + 0.3 and q.z > w[1] - 0.3 and q.z < w[3] + 0.3:
			on_ = true
			break
	if not on_: return true
	if q.x < 40.0 and q.y < 4.6:
		for o in [Vector2(0.14, 0.14), Vector2(-0.14, 0.14), Vector2(0.14, -0.14), Vector2(-0.14, -0.14)]:
			if rock_at(q.x + o.x, q.z + o.y) & 2: return true
	if q.x < 100.0 and q.y < 2.9:
		for c in data.marks.stones:
			if Vector2(q.x - c[0], q.z - c[1]).length() < 0.8: return true
	return false


# ------------------------------------------------------------------ paths --
func _np(i: int) -> Vector3:
	var n: Array = nodes[i]
	return Vector3(n[0], n[1], n[2])


func nearest_node(p: Vector3) -> int:
	var best := -1
	var bd := INF
	for i in nodes.size():
		var q := _np(i)
		var d := Vector2(q.x - p.x, q.z - p.z).length() + absf(q.y - p.y) * 6.0
		if d < bd:
			bd = d
			best = i
	return best


## A walk from one node to another: [{ p, door, warp }]
func find_path(a: int, b: int) -> Array:
	if a == b: return [{ "p": _np(b), "door": "" }]
	var open := { a: 0.0 }
	var g := { a: 0.0 }
	var prev := {}
	var done := {}
	var goal := _np(b)
	while not open.is_empty():
		var cur := -1
		var cf := INF
		for k in open:
			if open[k] < cf:
				cf = open[k]
				cur = k
		if cur == b: break
		open.erase(cur)
		done[cur] = true
		for e in links[cur]:
			var n: int = e[0]
			if done.has(n): continue
			var c: float = g[cur] + e[1]
			if not g.has(n) or c < g[n]:
				g[n] = c
				prev[n] = [cur, e[2]]
				open[n] = c + _np(n).distance_to(goal) * 0.5
	if not prev.has(b): return []
	var out: Array = []
	var k := b
	while k != a:
		out.push_front({ "p": _np(k), "door": prev[k][1] if prev[k][1] != "~" else "", "warp": prev[k][1] == "~" })
		k = prev[k][0]
	return out


# ------------------------------------------------------------------- life --
func ring_bell() -> void:
	bell_t = 0.0


func set_lamps(k: float, out := 0.0) -> void:
	lamp_k = k
	if glow and out != glow_out:
		glow_out = out
		glow.albedo_color = Color.WHITE.lerp(Color(0.16, 0.15, 0.17), out)


func update(dt: float, hero: Vector3) -> void:
	t += dt
	for k in doors: _door_update(doors[k], dt)
	for c in clouds:
		c.position.x += dt * 1.2
		if c.position.x > 200.0: c.position.x -= 400.0
	for i in mini(3, astro.size()):
		var a: Node3D = astro[i]
		a.basis = Basis(Vector3.UP, t * [0.35, -0.5, 0.8][i]) * Basis(Vector3.RIGHT, 0.5 + i * 0.7 + t * [0.13, 0.21, -0.17][i])
	if astro.size() > 3: (astro[3] as Node3D).scale = Vector3.ONE * (1.0 + sin(t * 2.0) * 0.08)
	for f in floats:
		var n: Node3D = f.node
		n.position = f.p + Vector3(sin(t * 0.4 + f.ph) * 0.15, sin(t * 0.8 + f.ph) * 0.18, cos(t * 0.33 + f.ph) * 0.15)
		n.rotation.y = t * 0.3 + f.ph
	if bell:
		bell_t += dt
		# it swings from its crown, the mouth out to one side and the other; the clapper follows a little behind
		var sw := func(u: float) -> float: return sin(u * 3.0) * 0.42 * exp(-u * 0.26) * smoothstep(0.0, 0.35, u) if u > 0.0 and u < 14.0 else 0.0
		bell.rotation.z = sw.call(bell_t)
		if clapper: clapper.rotation.z = sw.call(bell_t - 0.3) * 1.3
	for l in lamps:
		var fl := 1.0
		if l.name == "hearth": fl = 0.85 + 0.15 * sin(t * 9.0) * sin(t * 5.3 + 1.0)
		var kk := 1.0
		if l.name == "lamp" or l.name == "post": kk = lamp_k
		(l.light as OmniLight3D).light_energy = l.e * fl * kk
	for h in hens: _hen(h, dt, hero)
	if not swing.is_empty(): _swing_update(dt)


func _swing_update(dt: float) -> void:
	var k: float = G / float(swing.len)
	for i in 4:                                          # (small steps, so it neither gains nor loses by itself)
		var h := dt / 4.0
		var acc: float = -k * sin(swing.th) - 0.09 * swing.om
		if swing.amp > 0.0:
			# pumped: energy is put in while it's below the height it's kept at, always along the way it's moving
			var e: float = 0.5 * swing.om * swing.om + k * (1.0 - cos(swing.th))
			var want: float = k * (1.0 - cos(swing.amp))
			acc += swing.om * clampf((want - e) / maxf(want, 0.001), -1.0, 1.0) * 0.7
		swing.om += acc * h
		swing.th += swing.om * h
	(swing.n as Node3D).basis = swing.base * Basis(Vector3.RIGHT, -swing.th)      # (forward is +z: the seat rises before, its rider tipped back along the ropes)


func _hen(h: Dictionary, dt: float, her: Vector3) -> void:
	var node: Node3D = h.node
	var hp := node.position
	var hx: float = h.home[0]
	var hz: float = h.home[1]
	var dh := Vector2(hp.x - her.x, hp.z - her.z)
	if h.get("feed", 0.0) > 0.0:
		h.feed -= dt
		h.tgt = h.grain
	elif dh.length() < 1.1:
		var away := dh.normalized() * 2.0
		h.tgt = Vector3(clampf(hp.x + away.x, hx - 1.9, hx + 1.7), 0, clampf(hp.z + away.y, hz - 1.0, hz + 0.9))
		h.wait = 0.0
	var d := Vector2(h.tgt.x - hp.x, h.tgt.z - hp.z)
	if d.length() > 0.08:
		var fast: bool = dh.length() < 2.0 or h.get("feed", 0.0) > 0.0
		h.yaw = lerp_angle(h.yaw, atan2(d.x, d.y), 1.0 - exp(-8.0 * dt))
		var step := minf((2.2 if fast else 0.5) * dt, d.length())
		hp += Vector3(sin(h.yaw), 0, cos(h.yaw)) * step
		hp.y = absf(sin(t * 18.0)) * 0.03
		node.rotation = Vector3(0, h.yaw, 0)
	else:
		h.wait -= dt
		h.peck += dt
		hp.y = 0.0
		var busy: bool = h.get("feed", 0.0) > 0.0
		node.rotation = Vector3(0.5 if fmod(h.peck, 0.6 if busy else 1.3) > (0.3 if busy else 0.9) else 0.0, h.yaw, 0)
		if h.wait <= 0.0:
			h.wait = 1.5 + rng.randf() * 4.0
			h.tgt = Vector3(clampf(hp.x + rng.randf_range(-1.5, 1.5), hx - 1.7, hx + 1.6), 0, clampf(hp.z + rng.randf_range(-1.2, 1.2), hz - 1.0, hz + 0.9))
	node.position = hp


func feed_hens(at: Vector3) -> void:
	for i in hens.size():
		var a := i * TAU / hens.size()
		hens[i].grain = at + Vector3(sin(a) * (0.25 + (i % 3) * 0.14), 0, cos(a) * (0.25 + (i % 2) * 0.2))
		hens[i].feed = 9.0
