extends Node3D
## Little effects: the card puff when the umbrella appears or vanishes, square dust where she lands or runs hard,
## and the card fan trick (five cards spread from her hand, then flicked away).

const SUITS := ["heart", "spade", "diamond", "club"]

var card_meshes := {}
var card_mat: Material
var dust_mesh: BoxMesh
var parts: Array = []                # { node, v, w, life, t, g, scale, kind }
var fan_cards: Array = []


func setup(main_node: Node3D) -> void:
	card_mat = main_node.lit_mat
	var cs: Node3D = load("res://assets/cards.glb").instantiate()
	for s in SUITS:
		var mi: MeshInstance3D = cs.find_child("card_" + s, true, false)
		if mi: card_meshes[s] = mi.mesh
	cs.free()
	dust_mesh = BoxMesh.new()
	dust_mesh.size = Vector3.ONE
	var dm := StandardMaterial3D.new()
	dm.albedo_color = Color("d9cdb8")
	dm.roughness = 1.0
	dust_mesh.material = dm


func _card(suit: String) -> MeshInstance3D:
	var m := MeshInstance3D.new()
	m.mesh = card_meshes[suit]
	m.material_override = card_mat
	m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return m


func card_puff(pos: Vector3, n: int) -> void:
	for i in n:
		var m := _card(SUITS[i % 4])
		add_child(m)
		m.global_position = pos
		var a := randf() * TAU
		var sp := 0.6 + randf() * 1.2
		parts.append({ "node": m, "v": Vector3(cos(a) * sp, 0.6 + randf() * 1.6, sin(a) * sp), "w": Vector3(randf_range(-6, 6), randf_range(-6, 6), randf_range(-4, 4)),
			"life": 0.75, "t": 0.0, "g": 3.5, "scale": 1.0, "kind": "card" })


func dust(pos: Vector3, n: int, size: float) -> void:
	for i in n:
		var m := MeshInstance3D.new()
		m.mesh = dust_mesh
		m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		var s := (0.05 + randf() * 0.06) * size * 2.0
		add_child(m)
		m.global_position = Vector3(pos.x + randf_range(-0.15, 0.15), 0.04 + randf() * 0.05, pos.z + randf_range(-0.15, 0.15))
		m.scale = Vector3.ONE * s
		var a := randf() * TAU
		var sp := 0.4 + randf() * 0.9
		parts.append({ "node": m, "v": Vector3(cos(a) * sp, 0.3 + randf() * 0.6, sin(a) * sp), "w": Vector3.ZERO, "life": 0.55, "t": 0.0, "g": 1.2, "scale": s, "kind": "dust" })


## The card fan: five cards spread from her right fist, facing out, then flicked away.
func fan(c: Node3D, t: float, dur: float) -> void:
	var hand: Node3D = c.P.handR
	var S: float = c.S
	if fan_cards.is_empty() and t > 0.25 and t < dur - 0.75:
		for i in 5:
			var m := _card(SUITS[i % 4])
			hand.add_child(m)
			fan_cards.append(m)
		card_puff(c._hand_world("R"), 5)
	if not fan_cards.is_empty():
		var open := minf(1.0, (t - 0.25) / 0.45)
		for i in fan_cards.size():
			var m: MeshInstance3D = fan_cards[i]
			var b := Basis(Vector3(0, 0, 1), PI + (i - 2) * 0.32 * open)
			m.transform = Transform3D(b.scaled(Vector3.ONE * minf(1.0, open * 1.5)), Vector3(0, -3 * S, 1.5 * S) + b * Vector3(0, 4 * S * open, i * 0.004))
		if t > dur - 0.75: fan_end(c, true)


func fan_end(c: Node3D, fling: bool) -> void:
	if fan_cards.is_empty(): return
	var fwd := Vector3(sin(c.yaw), 0, cos(c.yaw))
	for m in fan_cards:
		var p: Vector3 = (m as Node3D).global_position
		m.get_parent().remove_child(m)
		if fling:
			add_child(m)
			m.global_position = p
			parts.append({ "node": m, "v": fwd * (3.0 + randf() * 2.0) + Vector3(randf_range(-1, 1), 1.5 + randf(), randf_range(-1, 1)),
				"w": Vector3(randf_range(-10, 10), randf_range(-10, 10), 0), "life": 0.9, "t": 0.0, "g": 2.5, "scale": 1.0, "kind": "card" })
		else:
			m.queue_free()
	fan_cards.clear()


func _process(dt: float) -> void:
	for i in range(parts.size() - 1, -1, -1):
		var p: Dictionary = parts[i]
		p.t += dt
		p.v.y -= p.g * dt
		p.v *= exp(-dt * 1.5)
		var m: Node3D = p.node
		m.position += p.v * dt
		m.rotation += p.w * dt
		var k: float = 1.0 - p.t / p.life
		var sc: float = p.scale * (0.6 + k * 0.6 if p.kind == "dust" else minf(1.0, k * 2.5))
		m.scale = Vector3.ONE * maxf(0.001, sc)
		if p.t >= p.life:
			m.queue_free()
			parts.remove_at(i)
