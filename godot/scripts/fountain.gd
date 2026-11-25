extends Node3D
## A fountain's water: eight streams falling from the bowl's lip into the basin, the splashes where they land, rings going
## out over the water, and (where nothing stands on the bowl) a jet. Small cubes on ballistic paths, so it's all one with the voxels.

const G := 9.81
const BASIN_Y := 0.468                # the basin's water; the bowl's; the lip the streams leave from
const BOWL_Y := 1.392
const LIP := Vector2(0.83, 1.37)
const JETS := 8
const PER := 15                       # drops in a stream
const ARCS := 9                       # the jet's
const PERA := 11
const HOPS := 5                       # splash drops at each stream's foot

var mm: MultiMesh
var t := 0.0
var jet := true
var cam: Camera3D
var snd: AudioStreamPlayer3D


func setup(main: Node3D, with_jet: bool) -> void:
	jet = with_jet
	cam = main.cam
	add_child(_water(1.35, 0.36, BASIN_Y, LIP.x + 0.21, JETS))
	add_child(_water(0.65, 0.0, BOWL_Y, 0.34 if jet else 0.0, 0))
	mm = MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = true
	var b := BoxMesh.new()
	b.size = Vector3.ONE * 0.048
	mm.mesh = b
	mm.instance_count = JETS * (PER + HOPS) + (ARCS * PERA if jet else 0)
	var mi := MultiMeshInstance3D.new()
	mi.multimesh = mm
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var m := StandardMaterial3D.new()
	m.vertex_color_use_as_albedo = true
	m.vertex_color_is_srgb = true
	m.roughness = 0.3
	mi.material_override = m
	mi.custom_aabb = AABB(Vector3(-2, 0, -2), Vector3(4, 3, 4))
	add_child(mi)
	for i in mm.instance_count: mm.set_instance_color(i, [Color("8cc0ee"), Color("b4dcfa"), Color("6aa6e0"), Color("dcf0ff")][(i * 7 + i / 3) % 4])
	snd = AudioStreamPlayer3D.new()
	var st = load("res://assets/audio/amb_fountain.ogg") if ResourceLoader.exists("res://assets/audio/amb_fountain.ogg") else null
	if st:
		st.loop = true
		snd.stream = st
		snd.unit_size = 2.4
		snd.max_distance = 18.0
		snd.volume_db = -6.0
		snd.position.y = 0.9
		add_child(snd)


## Water with rings on it, in steps of a building's voxel.
func _water(r: float, inner: float, y: float, foot: float, n: int) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var p := PlaneMesh.new()
	p.size = Vector2.ONE * r * 2.0
	mi.mesh = p
	mi.position.y = y
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
uniform float rr; uniform float ri; uniform float foot; uniform int n;
varying vec3 wp;
void vertex() { wp = VERTEX; }
void fragment() {
	vec2 p = (floor(wp.xz / 0.048) + 0.5) * 0.048;
	float d = length(p), h = 0.0;
	if (d > rr || d < ri) discard;
	for (int i = 0; i < n; i++) {
		float a = (float(i) + 0.5) / float(n) * 6.28318;
		float q = distance(p, vec2(cos(a), sin(a)) * foot);
		h += sin(q * 30.0 - TIME * 8.0) * exp(-q * 3.4);
	}
	if (n == 0) h = sin((d - foot) * 34.0 - TIME * 7.0) * 0.8;
	h += 0.28 * sin(d * 16.0 - TIME * 1.7) + 0.16 * sin(p.x * 21.0 + p.y * 13.0 + TIME * 2.3);
	vec3 c = vec3(0.10, 0.27, 0.58);
	c = mix(c, vec3(0.15, 0.36, 0.68), step(-0.35, h));
	c = mix(c, vec3(0.26, 0.5, 0.8), step(0.22, h));
	c = mix(c, vec3(0.62, 0.82, 0.95), step(0.72, h));
	ALBEDO = c;
	ROUGHNESS = 0.22;
	SPECULAR = 0.45;
}
"""
	var m := ShaderMaterial.new()
	m.shader = sh
	m.set_shader_parameter("rr", r)
	m.set_shader_parameter("ri", inner)
	m.set_shader_parameter("foot", foot)
	m.set_shader_parameter("n", n)
	mi.material_override = m
	return mi


func _process(dt: float) -> void:
	if not is_visible_in_tree() or cam == null or cam.global_position.distance_to(global_position) > 46.0:
		if snd and snd.playing: snd.stop()
		return
	if snd and snd.stream and not snd.playing: snd.play()
	t += dt
	var k := 0
	var fall := sqrt(2.0 * (LIP.y - BASIN_Y) / G)          # (how long a drop takes from the lip to the water)
	var v := 0.21 / fall
	for j in JETS:
		var a := (j + 0.5) / JETS * TAU
		var d := Vector3(cos(a), 0, sin(a))
		for i in PER:
			var q := fmod(t + float(i) / PER * fall + j * 0.037, fall)
			var p := d * (LIP.x - 0.02 + v * q) + Vector3(0, LIP.y - 0.5 * G * q * q, 0)
			var sc := 0.95 - 0.4 * q / fall
			mm.set_instance_transform(k, Transform3D(Basis().scaled(Vector3(sc, sc * (1.0 + q * 2.6), sc)), p))
			k += 1
		var f := d * (LIP.x + 0.19)
		for i in HOPS:                                        # up off the water, and back
			var life := 0.26 + 0.05 * (i % 3)
			var q := fmod(t * 1.0 + i * 0.083 + j * 0.051, life)
			var n := int((t + i * 0.083 + j * 0.051) / life) * 13 + i * 5 + j * 3
			var o := Vector3(sin(n * 2.4), 0, cos(n * 1.7)) * 0.42
			mm.set_instance_transform(k, Transform3D(Basis().scaled(Vector3.ONE * 0.5), Vector3(f.x + o.x * q, BASIN_Y + 0.5 * G * q * (life - q), f.z + o.z * q)))
			k += 1
	if jet:
		var up := 3.1
		var T := 2.0 * up / G
		for j in ARCS:
			var a := float(j) / ARCS * TAU + 0.2
			for i in PERA:
				var q := fmod(t + float(i) / PERA * T + j * 0.061, T)
				mm.set_instance_transform(k, Transform3D(Basis().scaled(Vector3.ONE * (0.85 - 0.3 * q / T)), Vector3(cos(a) * 0.54 * q, BOWL_Y + 0.02 + up * q - 0.5 * G * q * q, sin(a) * 0.54 * q)))
				k += 1
