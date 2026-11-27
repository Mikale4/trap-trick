extends Node3D
## "I took out the part in between." How Erebus goes from one place to another, and takes people with him: a ring of marks
## opens on the ground under them; in front of each a seam opens in the air, tall and narrow, then as wide as they are;
## they come apart into the little blocks they're made of, which wind up into it; it shuts. Arriving is the same, backwards,
## with a blast of whatever is lying about.
##
##     await warp.go([actors], true)        gone
##     await warp.go([actors], false)       here

const CORE := Color("fff0f4")
const MID := Color("ff4f82")
const DEEP := Color("8a1440")
const DARK := Color("1c1026")
const N := 420                                 # blocks to a person
const COVER := 0.36                            # how far in, the seam covers them and they're changed for blocks

var s: Node
var known := {}                                # a mesh: some points on it, and their colours
var _seam: Shader
var _bits: Shader
var _ring: Shader


func setup(story: Node) -> void:
	s = story
	_seam = Shader.new()
	_seam.code = """
shader_type spatial;
render_mode unshaded, skip_vertex_transform, cull_disabled, shadows_disabled, fog_disabled;
uniform float k; uniform float hk;
uniform vec4 core : source_color; uniform vec4 mid : source_color; uniform vec4 deep : source_color; uniform vec4 dark : source_color;
void vertex() {
	vec3 c = MODEL_MATRIX[3].xyz, to = CAMERA_POSITION_WORLD - c;
	to.y = 0.0; to = normalize(to);
	vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), to));
	VERTEX = (VIEW_MATRIX * vec4(c + right * VERTEX.x + vec3(0.0, VERTEX.y, 0.0) + to * 0.34, 1.0)).xyz;
}
void fragment() {
	vec2 cells = vec2(50.0, 104.0);
	vec2 g = (floor(UV * cells) + 0.5) / cells;
	float x = abs(g.x - 0.5) * 2.0, y = abs(g.y - 0.5) * 2.0;
	float n = fract(sin(dot(floor(UV * cells * 0.5) + floor(TIME * 16.0), vec2(12.9898, 78.233))) * 43758.5453);
	float lens = sqrt(max(0.0, 1.0 - (y * y) / max(hk * hk, 0.0001)));
	float f = x / max((k * 0.9 + 0.025) * lens * (0.84 + n * 0.3), 0.001);
	if (y > hk || f > 1.3 || (f > 1.0 && n < 0.45)) discard;
	ALBEDO = f < 0.4 ? core.rgb * 1.5 : f < 0.62 ? mix(core.rgb, mid.rgb, step(0.5, n)) * 1.3 : f < 0.84 ? mid.rgb : f < 1.0 ? deep.rgb : dark.rgb;
}
"""
	_bits = Shader.new()
	_bits.code = """
shader_type spatial;
render_mode unshaded, shadows_disabled;
uniform float w;
uniform vec4 mid : source_color; uniform vec4 core : source_color;
varying vec3 col;
void vertex() {
	vec3 p = INSTANCE_CUSTOM.xyz; float r = INSTANCE_CUSTOM.w;
	float d = 0.36 + (1.0 - clamp(p.y / 1.7, 0.0, 1.0)) * 0.24 + r * 0.12;
	float q = clamp((w - d) / 0.26, 0.0, 1.0), e = q * q * (3.0 - 2.0 * q);
	float a = e * (2.4 + r * 2.2), c = cos(a), n = sin(a), out_ = 1.0 + sin(q * 3.14159) * (0.5 + r * 1.3);
	vec2 xz = mat2(vec2(c, n), vec2(-n, c)) * p.xz * out_ * (1.0 - e);
	float sz = smoothstep(0.24, 0.36, w) * (1.0 - e * 0.7) * (1.0 - step(0.995, q));
	VERTEX = VERTEX * sz + vec3(xz.x, p.y + e * (1.15 - p.y) * 0.75 + sin(q * 3.14159) * (r - 0.35) * 0.5, xz.y);
	float hot = smoothstep(0.0, 0.5, q) * 0.9 + smoothstep(0.26, 0.34, w) * (1.0 - smoothstep(0.36, 0.5, w)) * 0.6;
	col = mix(COLOR.rgb, mix(mid.rgb, core.rgb, q * q), clamp(hot, 0.0, 1.0));
}
void fragment() { ALBEDO = col; }
"""
	_ring = Shader.new()
	_ring.code = """
shader_type spatial;
render_mode unshaded, cull_disabled, shadows_disabled, depth_draw_never;
uniform float open; uniform float al; uniform float cells = 120.0;
uniform vec4 mid : source_color; uniform vec4 deep : source_color; uniform vec4 dark : source_color;
void fragment() {
	vec2 g = ((floor(UV * cells) + 0.5) / cells - 0.5) * 2.0;
	float r = length(g) / max(open, 0.001), a = atan(g.y, g.x) / 6.28318;
	float m = 0.0;
	if (r > 0.94 && r < 1.0) m = 1.0;
	else if (r > 0.80 && r < 0.90) m = step(0.45, fract(a * 24.0 + TIME * 0.35)) * step(fract(a * 6.0 + TIME * 0.0875), 0.8);
	else if (r > 0.72 && r < 0.75) m = 1.0;
	else if (r > 0.40 && r < 0.70) m = step(0.93, fract(a * 12.0 - TIME * 0.2)) ;
	else if (r > 0.34 && r < 0.38) m = step(0.3, fract(a * 8.0 - TIME * 0.5));
	float n = fract(sin(dot(floor(UV * cells) + floor(TIME * 10.0), vec2(12.9898, 78.233))) * 43758.5453);
	float haze = (1.0 - smoothstep(0.0, 1.0, r)) * 0.4;
	if (r > 1.0) discard;
	ALBEDO = m > 0.5 ? mix(mid.rgb, deep.rgb, step(0.6, n)) * 1.15 : mix(deep.rgb, dark.rgb, 0.4);
	ALPHA = al * max(m * (0.75 + n * 0.25), haze);
}
"""


## Some points on somebody, as they stand: [where from their feet, colour].
func _points(a: Node3D) -> Array:
	var all: Array = []
	var total := 0.0
	for mi: MeshInstance3D in (a.body as Node3D).find_children("*", "MeshInstance3D", true, false):
		if mi.mesh == null or not mi.is_visible_in_tree(): continue
		if not known.has(mi.mesh): known[mi.mesh] = _sample(mi.mesh)
		var k: Array = known[mi.mesh]
		if k[0].is_empty(): continue
		all.append([mi.global_transform, k])
		total += k[2]
	var out: Array = []
	if total <= 0.0: return out
	var base: Vector3 = a.global_position
	for e in all:
		var pts: PackedVector3Array = e[1][0]
		var cols: PackedColorArray = e[1][1]
		var n := int(round(N * float(e[1][2]) / total))
		for i in n:
			var j := randi() % pts.size()
			out.append([(e[0] as Transform3D) * pts[j] - base, cols[j]])
	return out


func _sample(m: Mesh) -> Array:
	var pts := PackedVector3Array()
	var cols := PackedColorArray()
	var area := 0.0
	for si in m.get_surface_count():
		var arr := m.surface_get_arrays(si)
		var v: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
		var c = arr[Mesh.ARRAY_COLOR]
		var ix = arr[Mesh.ARRAY_INDEX]
		if v.is_empty() or c == null or ix == null or ix.is_empty(): continue
		var tris: int = ix.size() / 3
		for k in mini(160, tris):
			var t := (randi() % tris) * 3
			var u := randf()
			var w := randf()
			if u + w > 1.0:
				u = 1.0 - u
				w = 1.0 - w
			pts.append(v[ix[t]] + (v[ix[t + 1]] - v[ix[t]]) * u + (v[ix[t + 2]] - v[ix[t]]) * w)
			cols.append((c[ix[t]] as Color).srgb_to_linear())
		for t in range(0, ix.size(), 3 * maxi(1, tris / 80)): area += (v[ix[t + 1]] - v[ix[t]]).cross(v[ix[t + 2]] - v[ix[t]]).length() * maxi(1, tris / 80)
	return [pts, cols, sqrt(area)]


func _mat(sh: Shader) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = sh
	for k in [["core", CORE], ["mid", MID], ["deep", DEEP], ["dark", DARK]]: m.set_shader_parameter(k[0], k[1])
	return m


## Nobody here, until they come.
func hide_(list: Array) -> void:
	for a in list: (a.body as Node3D).visible = false


func go(list: Array, away: bool, secs := 1.7, o := {}) -> void:
	var root := Node3D.new()
	add_child(root)
	for a in list: (a.body as Node3D).visible = true
	var mid := Vector3.ZERO
	for a in list: mid += a.global_position / list.size()
	var rad := 0.0
	for a in list: rad = maxf(rad, Vector2(a.global_position.x - mid.x, a.global_position.z - mid.z).length())
	rad += 0.95
	var seams: Array = []
	var bits: Array = []
	for a in list:
		var p: Vector3 = a.global_position
		var h := 0.9
		var pts := _points(a)
		for q in pts: h = maxf(h, (q[0] as Vector3).y)
		var sm := MeshInstance3D.new()
		var qm := QuadMesh.new()
		qm.size = Vector2(1.2, h + 0.8)
		sm.mesh = qm
		sm.material_override = _mat(_seam)
		sm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		sm.custom_aabb = AABB(Vector3(-1, -2, -1), Vector3(2, 4, 2))
		root.add_child(sm)
		sm.global_position = p + Vector3(0, h * 0.5 + 0.04, 0)
		seams.append(sm.material_override)
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.use_colors = true
		mm.use_custom_data = true
		var bm := BoxMesh.new()
		bm.size = Vector3.ONE * 0.048
		mm.mesh = bm
		mm.instance_count = pts.size()
		for i in pts.size():
			var q: Vector3 = pts[i][0]
			mm.set_instance_transform(i, Transform3D.IDENTITY.scaled(Vector3.ONE * randf_range(0.7, 1.25)))
			mm.set_instance_color(i, pts[i][1])
			mm.set_instance_custom_data(i, Color(q.x, q.y, q.z, randf()))
		var mi := MultiMeshInstance3D.new()
		mi.multimesh = mm
		mi.material_override = _mat(_bits)
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		mi.custom_aabb = AABB(Vector3(-2, -1, -2), Vector3(4, 4, 4))
		root.add_child(mi)
		mi.global_position = p
		bits.append(mi.material_override)
	var rg := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2.ONE * rad * 2.0
	rg.mesh = pm
	var rm := _mat(_ring)
	rm.set_shader_parameter("cells", rad * 2.0 / 0.036)
	rg.material_override = rm
	rg.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(rg)
	rg.global_position = mid + Vector3(0, float(o.get("lift", 0.06)), 0)
	rg.visible = o.get("ring", true)
	var li := OmniLight3D.new()
	li.light_color = MID
	li.omni_range = 5.0 + rad * 2.0
	li.shadow_enabled = false
	root.add_child(li)
	li.global_position = mid + Vector3(0, 1.3, 0)
	s.main.sfx("warpout" if away else "warpin")
	if not away:
		hide_(list)
		s.shake = maxf(s.shake, 0.5)
		_blast(mid, rad, o)
	var shown := away
	var t0: float = s.time
	var next := 0.0
	while s.time < t0 + secs and not s.skipping:
		var u: float = clampf((s.time - t0) / secs, 0.0, 1.0)
		var w := u if away else 1.0 - u
		_at(seams, bits, rm, li, w)
		if shown != (w < COVER):
			shown = w < COVER
			for a in list: (a.body as Node3D).visible = shown
			s.shake = maxf(s.shake, 0.35)
			if not shown: _blast(mid, rad, o)
			else:
				for a in list: s.burst(a.global_position + Vector3(0, 0.9, 0), MID, DARK, 26, 1.7, -0.6, 0.03, 1.1)
		if s.time > next and w > 0.1 and w < 0.9:                      # (and sparks of it going up all the while)
			next = s.time + 0.11
			var q := randf() * TAU
			s.burst(mid + Vector3(cos(q), 0, sin(q)) * rad * randf_range(0.3, 1.0) + Vector3(0, 0.1, 0), MID, DEEP, 5, 1.0, 1.6, 0.028, 1.2, 24.0)
		await s.beat()
	for a in list: (a.body as Node3D).visible = not away
	if not s.skipping:
		if away: for a in list: s.burst(a.global_position + Vector3(0, 1.1, 0), CORE, MID, 16, 2.2, 0.0, 0.026, 0.8)
		else: for a in list: s.burst(a.global_position + Vector3(0, 0.1, 0), MID, DEEP, 12, 0.7, 0.9, 0.026, 1.6, 40.0)
	root.queue_free()


func _at(seams: Array, bits: Array, rm: ShaderMaterial, li: OmniLight3D, w: float) -> void:
	var k := smoothstep(0.06, 0.33, w) * (1.0 - 0.62 * smoothstep(0.38, 0.5, w)) * (1.0 - smoothstep(0.68, 0.94, w))
	var hk := smoothstep(0.0, 0.18, w) * (1.0 - smoothstep(0.86, 1.0, w))
	for m: ShaderMaterial in seams:
		m.set_shader_parameter("k", k * 0.82)
		m.set_shader_parameter("hk", hk)
	for m: ShaderMaterial in bits: m.set_shader_parameter("w", w)
	rm.set_shader_parameter("open", smoothstep(0.0, 0.3, w) * (1.0 - 0.5 * smoothstep(0.7, 1.0, w)))
	rm.set_shader_parameter("al", smoothstep(0.0, 0.12, w) * (1.0 - smoothstep(0.75, 1.0, w)))
	li.light_energy = 4.5 * k * (0.85 + 0.15 * sin(s.time * 40.0))


## What it blows outwards: snow, or whatever's said.
func _blast(mid: Vector3, rad: float, o: Dictionary) -> void:
	var c1: Color = o.get("c1", Color("e4edf8"))
	var c2: Color = o.get("c2", Color("8ea6cc"))
	for k in 10:
		var q := k / 10.0 * TAU
		s.burst(mid + Vector3(cos(q), 0, sin(q)) * rad * 0.7 + Vector3(0, 0.12, 0), c1, c2, 9, 3.2, -3.4, 0.05, 1.1, 70.0)
