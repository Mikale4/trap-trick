extends Node3D
## Trap Trick -- the main scene. Builds the garden (sky, sun, fog, ground, the baked scenery), Trap Trick, the follow
## camera and the HUD at start, and reads the keyboard, mouse and gamepad.
##
## Dev: run with  -- --shot=<file.png> [--walk|--run] [--do=umbrella,open,wave...] [--at=150] [--cam=yaw,pitch,dist]
## to play a few commands, save a screenshot at frame --at and quit.

const BAKE_PATH := "res://assets/bake.json"
const SUN_DIR := Vector3(-0.72, 0.34, 0.6)    # toward the light: the sun just down in the south-west

var bake: Dictionary
var tt: Node3D                       # Trap Trick
var fx: Node3D                       # the effects
var cam: Camera3D
var sun: DirectionalLight3D
var env: Environment
var sky_mat: ProceduralSkyMaterial
var stars: ImageTexture
# the two places: the town (the world) and the Wonder Garden (her own dimension, through the door in the alley)
var level := "town"
var start_level := "town"
var garden: Node3D
var town: Node3D
var travel := {}                       # going through the door: { to, t }
var fade: ColorRect
var hud_place: Label
var spawn := Vector3.INF               # dev: --pos=x,z,yaw
var rich_light := true            # L switches between the rich desktop lighting and the web version's simple look
var clouds: Array[Node3D] = []
var floaters: Array = []             # the giant cards floating over the garden: { node, y0, ph, spin }
var garden_t := 0.0
# the summoning circle on her stage (see _summon_setup)
var summon_rings: Array = []          # [outer, inner]: they turn opposite ways
var summon_mat: StandardMaterial3D
var summon_light: OmniLight3D
var summon_sparks: GPUParticles3D
var summon_burst: GPUParticles3D
var summon_glow := 1.0                # its brightness: it pulses, flares as she arrives, brightens while she stands in it
var summon_t := 0.0
var arrived := false
var colliders: Array = []
var bound := 92.0
var lit_mat: StandardMaterial3D
var glow_mat: StandardMaterial3D

# the follow camera
var cam_yaw := 0.3                  # from the south: the gate, the castle and the moon ahead
var cam_pitch := 0.1
var cam_dist := 3.7
var cam_tgt := Vector3(0, 1.1, 3.5)
var dragging := false

# input
var pressed: Array[int] = []
var pad_pressed: Array[int] = []
var trig := { 4: false, 5: false }
var skel := false

# the HUD
var hud_help: Control
var hud_umb: Label
var hud_face: Label
var hud_light: Label
var hud_umb_box: PanelContainer
var hud_prompt: Label
var hud_prompt_box: PanelContainer
var hud_skel: PanelContainer
var hud_last := ""
var ui_font: Font
var title_font: Font

# dev screenshot
var shot_path := ""
var shot_mode := ""
var shot_at := 150
var shot_do: PackedStringArray = []
var shot_cam := Vector3.ZERO
var shot_camy := 0.0                # dev: raise the camera's target (m), e.g. to frame her head
var dev_hold_jump := false
var frames := 0
var light_off: PackedStringArray = []   # dev: rich-lighting features to leave off (ssao, soft, sky, glow, haze)
var bench_us := 0                  # dev: time from frame 40 to the shot, to report the frame rate


func _ready() -> void:
	bake = JSON.parse_string(FileAccess.get_file_as_string(BAKE_PATH))
	colliders = bake.world.colliders
	bound = bake.world.bound
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--shot="): shot_path = a.substr(7)
		elif a == "--walk" or a == "--run": shot_mode = a.substr(2)
		elif a == "--simple": rich_light = false
		elif a == "--garden": start_level = "garden"
		elif a.begins_with("--pos="):
			var q := a.substr(6).split(",")
			spawn = Vector3(float(q[0]), float(q[1]), float(q[2]))
		elif a.begins_with("--no="): light_off = a.substr(5).split(",")
		elif a.begins_with("--at="): shot_at = int(a.substr(5))
		elif a.begins_with("--do="): shot_do = a.substr(5).split(",")
		elif a.begins_with("--camy="): shot_camy = float(a.substr(7))
		elif a.begins_with("--cam="):
			var c := a.substr(6).split(",")
			shot_cam = Vector3(float(c[0]), float(c[1]), float(c[2]))
	if shot_path != "": DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)   # so the frame rate is real
	_materials()
	_environment()
	garden = Node3D.new()
	garden.name = "garden"
	add_child(garden)
	_ground()
	_scenery()
	fx = preload("res://scripts/fx.gd").new()
	add_child(fx)
	fx.setup(self)
	tt = preload("res://scripts/trap_trick.gd").new()
	add_child(tt)
	tt.setup(bake, self)
	_summon_setup()
	tt.position = Vector3(0, 0, 1.2)       # on her stage, facing the camera, her garden behind her
	tt.yaw = 0.0
	tt.t_yaw = 0.0
	_set_lighting(rich_light)
	cam = Camera3D.new()
	cam.fov = 50.0
	cam.near = 0.05
	cam.far = 900.0
	add_child(cam)
	cam.current = true
	_hud()
	town = preload("res://scripts/town.gd").new()
	town.name = "town"
	add_child(town)
	town.setup(self, bake)
	_set_level(start_level)
	if start_level == "town":
		summon_t = 99.0                      # (no summoning: she's simply here)
		arrived = true
		tt.visible = true
		tt.position = Vector3(1.5, 0, 6.0)
		tt.yaw = 0.35
		tt.t_yaw = 0.35
	if spawn != Vector3.INF:
		tt.position = Vector3(spawn.x, 0, spawn.y)
		tt.yaw = spawn.z
		tt.t_yaw = spawn.z
	_update_camera(1.0)
	_fade_layer()


## Every voxel mesh shows its baked vertex colours: lit (Lambert, no shine), or unlit for glowing voxels.
func _materials() -> void:
	lit_mat = StandardMaterial3D.new()
	lit_mat.vertex_color_use_as_albedo = true
	lit_mat.roughness = 1.0
	lit_mat.specular_mode = BaseMaterial3D.SPECULAR_DISABLED
	lit_mat.diffuse_mode = BaseMaterial3D.DIFFUSE_LAMBERT
	glow_mat = StandardMaterial3D.new()
	glow_mat.vertex_color_use_as_albedo = true
	glow_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED


func voxelize(n: Node, lit: Material = null, glow: Material = null) -> void:
	if lit == null: lit = lit_mat
	if glow == null: glow = glow_mat
	for c in n.find_children("*", "MeshInstance3D", true, false):
		var mi := c as MeshInstance3D
		if mi.mesh == null: continue
		for i in mi.mesh.get_surface_count():
			var m := mi.mesh.surface_get_material(i)
			var unlit := m is BaseMaterial3D and (m as BaseMaterial3D).shading_mode == BaseMaterial3D.SHADING_MODE_UNSHADED
			mi.set_surface_override_material(i, glow if unlit else lit)


## The sky and light for each place. The town: a clear afternoon, a warm sun high in the south-west, soft clouds.
## The Wonder Garden: twilight, the sun just down in the south-west, the sky deepening to indigo overhead with the first
## stars, a rose glow along the horizon; a violet fill, a low warm light, lavender mist. The lamps do the rest.
func _apply_env(lvl: String) -> void:
	if lvl == "garden":
		sky_mat.sky_top_color = Color("1c2257")
		sky_mat.sky_horizon_color = Color("d88aa8")
		sky_mat.sky_curve = 0.11
		sky_mat.ground_horizon_color = Color("9a6f9c")
		sky_mat.ground_bottom_color = Color("1d1c35")
		sky_mat.sky_cover = stars
		env.ambient_light_color = Color("958cc9")
		env.ambient_light_energy = 0.56
		env.fog_light_color = Color("6c5d9c")
		env.fog_density = 0.008
		env.fog_height = 0.7
		env.fog_height_density = 0.05
		sun.light_color = Color("ffae8c")
		sun.light_energy = 0.62
		sun.sky_mode = DirectionalLight3D.SKY_MODE_LIGHT_ONLY   # it's below the hills: no disc in the sky
		sun.transform = Transform3D(Basis.looking_at(-SUN_DIR.normalized(), Vector3.UP), Vector3.ZERO)
	else:
		sky_mat.sky_top_color = Color("3f7fd8")
		sky_mat.sky_horizon_color = Color("c4def8")
		sky_mat.sky_curve = 0.15
		sky_mat.ground_horizon_color = Color("c4def8")
		sky_mat.ground_bottom_color = Color("6a9a52")
		sky_mat.sky_cover = null
		env.ambient_light_color = Color(0.86, 0.85, 0.9)
		env.ambient_light_energy = 0.55
		env.fog_light_color = Color("c8dcf4")
		env.fog_density = 0.0035
		env.fog_height = 0.0
		env.fog_height_density = 0.0
		sun.light_color = Color("fff0d8")
		sun.light_energy = 1.0
		sun.sky_mode = DirectionalLight3D.SKY_MODE_LIGHT_AND_SKY
		sun.transform = Transform3D(Basis.looking_at(-Vector3(-0.5, 0.95, 0.55).normalized(), Vector3.UP), Vector3.ZERO)


func _environment() -> void:
	sky_mat = ProceduralSkyMaterial.new()
	stars = _stars()
	var sky := Sky.new()
	sky.sky_material = sky_mat
	env = Environment.new()
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.tonemap_mode = Environment.TONE_MAPPER_LINEAR    # (film tonemapping washes the colours out)
	env.fog_enabled = true
	env.fog_sky_affect = 0.0
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)
	sun = DirectionalLight3D.new()
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 45.0
	sun.shadow_blur = 1.5
	add_child(sun)
	# the rich lighting's settings (switched on and off in _set_lighting)
	env.ambient_light_sky_contribution = 0.22
	env.ssao_radius = 0.35
	env.ssao_intensity = 4.0
	env.ssao_power = 1.8
	env.ssao_detail = 1.2
	env.ssao_light_affect = 0.55
	env.glow_hdr_threshold = 1.5
	env.glow_intensity = 0.9
	env.glow_bloom = 0.0
	env.glow_blend_mode = Environment.GLOW_BLEND_MODE_SCREEN


## Two lighting levels, L switches. Simple is the web version's look. Rich adds: ambient occlusion in the creases and
## where things meet the ground, sun shadows that soften with distance (crisp at her feet, blurred further out), a fill
## light faintly tinted by the sky (bluer from above, greener from the lawn below), a glow around the lamp
## heads, and haze toward the edge of the garden. It roughly doubles the frame time (Intel UHD, 1280x720: about 70 fps vs 130).
func _set_lighting(rich: bool) -> void:
	rich_light = rich
	var on := func(f: String) -> bool: return rich and not light_off.has(f)
	env.ssao_enabled = on.call("ssao")
	env.glow_enabled = on.call("glow")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY if on.call("sky") else Environment.AMBIENT_SOURCE_COLOR
	env.fog_aerial_perspective = 0.35 if on.call("haze") else 0.0
	sun.light_angular_distance = 1.5 if on.call("soft") else 0.0
	RenderingServer.directional_soft_shadow_filter_set_quality(
		RenderingServer.SHADOW_QUALITY_SOFT_MEDIUM if on.call("soft") else RenderingServer.SHADOW_QUALITY_SOFT_LOW)
	# the lamp heads go past white, so the glow picks out only them (her gems stay as on the web: a glow made them LEDs)
	if light_off.has("shadow"): sun.shadow_enabled = false
	if light_off.has("fog"): env.fog_enabled = false
	if light_off.has("cast"):
		for gi in find_children("*", "GeometryInstance3D", true, false): if not gi.get_parent() is CharacterBody3D and not tt.is_ancestor_of(gi): gi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var k := 1.6 if on.call("glow") else 1.0
	glow_mat.albedo_color = Color(k, k, k)


## The first stars: a panorama laid over the sky, thick overhead and fading out toward the glow on the horizon.
func _stars() -> ImageTexture:
	var W := 2048
	var img := Image.create(W, W / 2, false, Image.FORMAT_RGBA8)
	var rng := RandomNumberGenerator.new()
	rng.seed = 7
	for i in 1500:
		var v := pow(rng.randf(), 1.6) * 0.42                # 0 is straight up, 0.5 the horizon
		var x := rng.randi_range(0, W - 1)
		var y := int(v * W / 2)
		var b := rng.randf_range(0.25, 1.0) * clampf((0.42 - v) / 0.18, 0.0, 1.0)
		var c := Color(1.0, 0.95 + rng.randf() * 0.05, 0.9 + rng.randf() * 0.1, b)
		img.set_pixel(x, y, c)
		if b > 0.85: img.set_pixel((x + 1) % W, y, Color(c, b * 0.6))
	return ImageTexture.create_from_image(img)


func _ground() -> void:
	var gs: float = bake.world.groundSize
	var plane := PlaneMesh.new()
	plane.size = Vector2(gs, gs)
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = load("res://assets/ground.png")
	mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST_WITH_MIPMAPS_ANISOTROPIC
	mat.roughness = 1.0
	mat.specular_mode = BaseMaterial3D.SPECULAR_DISABLED
	var g := MeshInstance3D.new()
	g.mesh = plane
	g.material_override = mat
	garden.add_child(g)
	var far_plane := PlaneMesh.new()
	far_plane.size = Vector2(900, 900)
	var fm := StandardMaterial3D.new()
	fm.albedo_color = Color.hex((int(bake.world.get("farColor", 0x67b346)) << 8) | 0xff)
	fm.roughness = 1.0
	var f := MeshInstance3D.new()
	f.mesh = far_plane
	f.material_override = fm
	f.position.y = -0.02
	garden.add_child(f)


## The baked scenery: every prop placed as in the web version; the grass tufts and little flowers as MultiMeshes.
func _scenery() -> void:
	var w: Node3D = load("res://assets/world.glb").instantiate()
	garden.add_child(w)
	voxelize(w)
	var by_name := {}
	for n in w.find_children("*", "Node3D", true, false): by_name[String(n.name)] = n
	for i in int(bake.world.clouds):
		if by_name.has("cloud_%d" % i):
			var c: Node3D = by_name["cloud_%d" % i]
			clouds.append(c)
			for mi in [c] + c.find_children("*", "GeometryInstance3D", true, false):
				if mi is GeometryInstance3D: mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF   # as on the web: no shadows from the clouds
	# the summoning circle's rings: their own material, so they can pulse
	summon_mat = StandardMaterial3D.new()
	summon_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	summon_mat.vertex_color_use_as_albedo = true
	for nm in ["summon_outer", "summon_inner"]:
		if not by_name.has(nm): continue
		var r: Node3D = by_name[nm]
		summon_rings.append(r)
		for mi in [r] + r.find_children("*", "MeshInstance3D", true, false):
			if mi is MeshInstance3D:
				mi.material_override = summon_mat
				mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	# props marked _nc cast no shadow (the far backdrop, the floating cards, her stage's ring)
	for n in w.find_children("*_nc", "Node3D", true, false):
		for gi in [n] + n.find_children("*", "GeometryInstance3D", true, false):
			if gi is GeometryInstance3D: gi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	# the moon: unlit and out of the mist
	if by_name.has("moon"):
		var mm_ := StandardMaterial3D.new()
		mm_.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		mm_.vertex_color_use_as_albedo = true
		mm_.disable_fog = true
		mm_.albedo_color = Color(1.15, 1.1, 1.1)
		for mi in [by_name["moon"]] + (by_name["moon"] as Node).find_children("*", "MeshInstance3D", true, false):
			if mi is MeshInstance3D:
				mi.material_override = mm_
				mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	# the giant cards floating over the garden
	var rng := RandomNumberGenerator.new()
	rng.seed = 3
	for i in int(bake.world.get("floaters", 0)):
		var f: Node3D = by_name.get("float_%d" % i)
		if f == null: continue
		for mi in [f] + f.find_children("*", "GeometryInstance3D", true, false):
			if mi is GeometryInstance3D: mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		floaters.append({ "node": f, "y0": f.position.y, "ph": rng.randf() * TAU, "spin": (0.08 + rng.randf() * 0.1) * (1.0 if i % 2 else -1.0) })
	# the lamps' lights (warm pools on the path), the glasshouse's amber, the stage's pink
	for l in ([] if light_off.has("lights") else bake.world.get("lights", [])):
		var o := OmniLight3D.new()
		o.position = Vector3(l.p[0], l.p[1], l.p[2])
		o.light_color = Color.hex((int(l.c) << 8) | 0xff)
		o.light_energy = float(l.e)
		o.omni_range = float(l.r)
		o.omni_attenuation = 1.4
		o.shadow_enabled = false
		garden.add_child(o)
	if not light_off.has("particles"): _particles()
	var inst: Array = bake.world.instances
	for i in inst.size():
		var src: MeshInstance3D = by_name.get("inst_%d" % i)
		if src == null: continue
		src.visible = false
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.mesh = src.mesh
		var list: Array = inst[i].transforms
		mm.instance_count = list.size()
		for k in list.size():
			var e: Array = list[k]   # a column-major 4x4 matrix
			var b := Basis(Vector3(e[0], e[1], e[2]), Vector3(e[4], e[5], e[6]), Vector3(e[8], e[9], e[10]))
			mm.set_instance_transform(k, Transform3D(b, Vector3(e[12], e[13], e[14])))
		var mmi := MultiMeshInstance3D.new()
		mmi.multimesh = mm
		mmi.material_override = lit_mat
		mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		garden.add_child(mmi)


## Rose petals drifting down over the courtyard (red and white), and little glowing motes rising slowly.
func _particles() -> void:
	var petals := GPUParticles3D.new()
	petals.amount = 90
	petals.lifetime = 10.0
	petals.preprocess = 10.0
	petals.visibility_aabb = AABB(Vector3(-14, -7, -14), Vector3(28, 9, 28))
	petals.position = Vector3(0, 5.5, 0)
	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	pm.emission_box_extents = Vector3(10, 0.5, 10)
	pm.direction = Vector3(0.3, -1, 0.15)
	pm.spread = 30.0
	pm.initial_velocity_min = 0.15
	pm.initial_velocity_max = 0.4
	pm.gravity = Vector3(0.12, -0.3, 0.04)
	pm.particle_flag_rotate_y = true
	pm.angle_min = 0.0
	pm.angle_max = 360.0
	pm.angular_velocity_min = -160.0
	pm.angular_velocity_max = 160.0
	var ramp := Gradient.new()
	ramp.set_color(0, Color("c8203c"))
	ramp.set_color(1, Color("f4eef6"))
	ramp.add_point(0.7, Color("e0304f"))
	var rt := GradientTexture1D.new()
	rt.gradient = ramp
	pm.color_initial_ramp = rt
	petals.process_material = pm
	var pmesh := BoxMesh.new()
	pmesh.size = Vector3(0.08, 0.012, 0.055)
	var pmat := StandardMaterial3D.new()
	pmat.vertex_color_use_as_albedo = true
	pmat.roughness = 1.0
	pmesh.material = pmat
	petals.draw_pass_1 = pmesh
	petals.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	garden.add_child(petals)
	var motes := GPUParticles3D.new()
	motes.amount = 50
	motes.lifetime = 7.0
	motes.preprocess = 7.0
	motes.visibility_aabb = AABB(Vector3(-14, -2, -14), Vector3(28, 6, 28))
	motes.position = Vector3(0, 1.2, 0)
	var mm := ParticleProcessMaterial.new()
	mm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	mm.emission_box_extents = Vector3(11, 1.0, 11)
	mm.direction = Vector3(0, 1, 0)
	mm.spread = 60.0
	mm.initial_velocity_min = 0.04
	mm.initial_velocity_max = 0.14
	mm.gravity = Vector3(0, 0.03, 0)
	var sc := Curve.new()
	sc.add_point(Vector2(0, 0))
	sc.add_point(Vector2(0.25, 1))
	sc.add_point(Vector2(0.75, 1))
	sc.add_point(Vector2(1, 0))
	var sct := CurveTexture.new()
	sct.curve = sc
	mm.scale_curve = sct
	var mr := Gradient.new()
	mr.set_color(0, Color("ffd88a"))
	mr.set_color(1, Color("ff9ad6"))
	var mrt := GradientTexture1D.new()
	mrt.gradient = mr
	mm.color_initial_ramp = mrt
	motes.process_material = mm
	var mmesh := BoxMesh.new()
	mmesh.size = Vector3(0.035, 0.035, 0.035)
	var mmat := StandardMaterial3D.new()
	mmat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mmat.vertex_color_use_as_albedo = true
	mmat.albedo_color = Color(1.8, 1.8, 1.8)
	mmesh.material = mmat
	motes.draw_pass_1 = mmesh
	motes.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	garden.add_child(motes)


## The summoning circle: where one arrives in her garden. Sparkles and thin streaks of light rise from its rings, little
## cards drift up and turn, a pink light pulses on the stage. At the start she is summoned: the circle flares, a burst
## of light, and she appears in a puff of cards.
func _summon_setup() -> void:
	var pmat := func(col_a: Color, col_b: Color, k: float) -> StandardMaterial3D:
		var m := StandardMaterial3D.new()
		m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		m.vertex_color_use_as_albedo = true
		m.albedo_color = Color(k, k, k)
		return m
	var ramp := func(a: Color, b: Color) -> GradientTexture1D:
		var gr := Gradient.new()
		gr.set_color(0, a)
		gr.set_color(1, b)
		var t := GradientTexture1D.new()
		t.gradient = gr
		return t
	var fade := Curve.new()
	fade.add_point(Vector2(0, 0))
	fade.add_point(Vector2(0.15, 1))
	fade.add_point(Vector2(0.7, 0.8))
	fade.add_point(Vector2(1, 0))
	var fade_t := CurveTexture.new()
	fade_t.curve = fade
	var ring_pm := func(r_in: float, r_out: float, v0: float, v1: float) -> ParticleProcessMaterial:
		var pm := ParticleProcessMaterial.new()
		pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_RING
		pm.emission_ring_axis = Vector3(0, 1, 0)
		pm.emission_ring_radius = r_out
		pm.emission_ring_inner_radius = r_in
		pm.emission_ring_height = 0.05
		pm.direction = Vector3(0, 1, 0)
		pm.spread = 8.0
		pm.initial_velocity_min = v0
		pm.initial_velocity_max = v1
		pm.gravity = Vector3.ZERO
		pm.scale_curve = fade_t
		return pm
	var make := func(amount: int, life: float, pm: ParticleProcessMaterial, mesh: Mesh, mat: Material) -> GPUParticles3D:
		var p := GPUParticles3D.new()
		p.amount = amount
		p.lifetime = life
		p.preprocess = life
		p.process_material = pm
		p.draw_pass_1 = mesh
		p.material_override = mat
		p.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		p.visibility_aabb = AABB(Vector3(-4, -1, -4), Vector3(8, 8, 8))
		garden.add_child(p)
		return p
	# sparkles rising off the rings, slowly, swaying
	var spm: ParticleProcessMaterial = ring_pm.call(1.6, 2.45, 0.35, 0.9)
	spm.color_initial_ramp = ramp.call(Color("ff5fb4"), Color("b07cff"))
	spm.turbulence_enabled = true
	spm.turbulence_noise_strength = 0.25
	spm.turbulence_noise_scale = 2.0
	spm.damping_min = 0.1
	spm.damping_max = 0.3
	var sbox := BoxMesh.new()
	sbox.size = Vector3(0.035, 0.035, 0.035)
	summon_sparks = make.call(90, 2.8, spm, sbox, pmat.call(Color.WHITE, Color.WHITE, 1.35))
	# thin streaks of light shooting up from the outer ring
	var lpm: ParticleProcessMaterial = ring_pm.call(2.15, 2.45, 1.4, 2.6)
	lpm.color_initial_ramp = ramp.call(Color("ff7cc6"), Color("c194ff"))
	var lbox := BoxMesh.new()
	lbox.size = Vector3(0.016, 0.34, 0.016)
	make.call(18, 1.1, lpm, lbox, pmat.call(Color.WHITE, Color.WHITE, 1.2))
	# little cards drifting up from the suits and turning
	var cpm: ParticleProcessMaterial = ring_pm.call(1.7, 2.2, 0.25, 0.45)
	cpm.particle_flag_rotate_y = true
	cpm.angular_velocity_min = -90.0
	cpm.angular_velocity_max = 90.0
	cpm.scale_min = 0.32
	cpm.scale_max = 0.42
	var cards := make.call(6, 4.5, cpm, fx.card_meshes.get("heart"), lit_mat) as GPUParticles3D
	cards.draw_passes = 2
	cards.draw_pass_2 = fx.card_meshes.get("spade")
	# her arrival: a burst of light from the circle, up and out
	var bpm := ParticleProcessMaterial.new()
	bpm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_RING
	bpm.emission_ring_axis = Vector3(0, 1, 0)
	bpm.emission_ring_radius = 2.4
	bpm.emission_ring_inner_radius = 0.3
	bpm.emission_ring_height = 0.1
	bpm.direction = Vector3(0, 1, 0)
	bpm.spread = 35.0
	bpm.initial_velocity_min = 2.0
	bpm.initial_velocity_max = 4.5
	bpm.gravity = Vector3(0, -2.5, 0)
	bpm.damping_min = 0.8
	bpm.damping_max = 1.6
	bpm.scale_curve = fade_t
	bpm.color_initial_ramp = ramp.call(Color("ffd0ec"), Color("ff6fb8"))
	var bbox := BoxMesh.new()
	bbox.size = Vector3(0.05, 0.05, 0.05)
	summon_burst = make.call(110, 1.6, bpm, bbox, pmat.call(Color.WHITE, Color.WHITE, 1.7))
	summon_burst.one_shot = true
	summon_burst.explosiveness = 0.92
	summon_burst.preprocess = 0.0
	summon_burst.emitting = false
	# the stage's pink light
	summon_light = OmniLight3D.new()
	summon_light.position = Vector3(0, 0.35, 0)
	summon_light.light_color = Color("ff8fd0")
	summon_light.omni_range = 4.0
	summon_light.omni_attenuation = 1.3
	garden.add_child(summon_light)
	tt.visible = false                     # until she is summoned


func _summon_update(dt: float) -> void:
	summon_t += dt
	var inside := Vector2(tt.position.x, tt.position.z).length() < 2.45 and tt.position.y < 1.0
	var want := (1.3 if inside else 1.0) * (1.0 + 0.2 * sin(summon_t * 2.2))
	want += 1.8 * exp(-pow((summon_t - 0.6) / 0.3, 2.0))      # the flare as she arrives
	summon_glow += (want - summon_glow) * (1.0 - exp(-10.0 * dt))
	var k := summon_glow * (1.05 if rich_light else 0.9)
	summon_mat.albedo_color = Color(k, k, k)
	summon_light.light_energy = 0.45 * summon_glow
	summon_sparks.amount_ratio = 1.0 if inside else 0.55
	if summon_rings.size() == 2:
		(summon_rings[0] as Node3D).rotation.y += dt * 0.18
		(summon_rings[1] as Node3D).rotation.y -= dt * 0.3
	if not arrived and summon_t > 0.6:
		arrived = true
		tt.visible = true
		summon_burst.emitting = true
		fx.card_puff(tt.position + Vector3(0, 1.0, 0), 12)


## Push a point out of the scenery's collision circles, and keep it inside the garden.
func collide(p: Vector3, r: float) -> Vector3:
	if level == "town": return town.collide(p, r)
	for c in colliders:
		var dx: float = p.x - c[0]
		var dz: float = p.z - c[1]
		var d := sqrt(dx * dx + dz * dz)
		var m: float = c[2] + r
		if d < m and d > 0.00001:
			p.x = c[0] + dx / d * m
			p.z = c[1] + dz / d * m
	var dd := Vector2(p.x, p.z).length()
	if dd > bound:
		p.x *= bound / dd
		p.z *= bound / dd
	return p


func seats() -> Array:
	return town.seats() if level == "town" else bake.world.seats


## Into one place or the other: show its nodes, dress the sky, set her camera behind her.
func _set_level(lvl: String) -> void:
	level = lvl
	garden.visible = lvl == "garden"
	town.visible = lvl == "town"
	_apply_env(lvl)
	if hud_place: hud_place.text = "the Wonder Garden" if lvl == "garden" else "the town of Thistlewick"


## G: sit or stand, talk to whoever is near, open the door in the alley, or (in the garden, on the circle) go back.
func _interact() -> void:
	if not travel.is_empty(): return
	if tt.seat != null or tt.near_seat() != null:
		tt.sit_toggle()
	elif level == "town" and town.near_door(tt.position):
		_travel("garden")
	elif level == "garden" and Vector2(tt.position.x, tt.position.z).length() < 2.2 and arrived:
		_travel("town")
	elif level == "town":
		town.talk(tt.position)


# ----------------------------------------------------------------- travel --
func _fade_layer() -> void:
	var layer := CanvasLayer.new()
	layer.layer = 5
	add_child(layer)
	fade = ColorRect.new()
	fade.color = Color(1.0, 0.86, 0.96, 0.0)
	fade.set_anchors_preset(Control.PRESET_FULL_RECT)
	fade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(fade)


## Down through the door into her garden (the hatch swings up, pink light, she drops in, a fade; then the summoning
## circle brings her in), or back from the circle to the alley (the circle flares, she goes in a puff of cards, a fade,
## and she's back by the door as it falls shut).
func _travel(to: String) -> void:
	travel = { "to": to, "t": 0.0, "switched": false }
	tt.cancel_action(true)


func _travel_update(dt: float) -> void:
	travel.t += dt
	var t_: float = travel.t
	if travel.to == "garden":
		town.door_open = clampf(t_ / 0.6, 0.0, 1.0)
		if t_ > 0.5 and tt.visible and not travel.switched:
			fx.card_puff(tt.position + Vector3(0, 0.8, 0), 10)
			tt.visible = false
		fade.color.a = clampf((t_ - 0.55) / 0.35, 0.0, 1.0) if t_ < 1.0 else clampf(1.0 - (t_ - 1.0) / 0.45, 0.0, 1.0)
		if t_ >= 0.95 and not travel.switched:
			travel.switched = true
			_set_level("garden")
			tt.position = Vector3(0, 0, 0.6)
			tt.yaw = 0.0
			tt.t_yaw = 0.0
			cam_yaw = 0.3
			cam_tgt = Vector3(0, 1.1, 0.6)
			summon_t = 0.0                    # the circle summons her in
			arrived = false
			town.door_open = 0.0
		if t_ >= 1.5: travel = {}
	else:
		summon_glow += dt * 6.0 if t_ < 0.4 else 0.0
		if t_ > 0.35 and tt.visible and not travel.switched:
			fx.card_puff(tt.position + Vector3(0, 0.9, 0), 12)
			summon_burst.restart()
			tt.visible = false
		fade.color.a = clampf((t_ - 0.4) / 0.35, 0.0, 1.0) if t_ < 0.85 else clampf(1.0 - (t_ - 0.85) / 0.45, 0.0, 1.0)
		if t_ >= 0.8 and not travel.switched:
			travel.switched = true
			_set_level("town")
			var d: Dictionary = bake.town.door
			tt.position = Vector3(d.x + 1.2, 0, d.z)
			tt.yaw = PI / 2
			tt.t_yaw = PI / 2
			cam_yaw = PI / 2 + 0.3            # from the alley's mouth, looking back at her and the door
			cam_tgt = tt.position + Vector3(0, 1.1, 0)
			town.door_open = 1.0
			tt.visible = true
			fx.card_puff(tt.position + Vector3(0, 0.9, 0), 10)
		if travel.switched: town.door_open = clampf(1.0 - (t_ - 0.8) / 0.6, 0.0, 1.0)
		if t_ >= 1.5: travel = {}


# ------------------------------------------------------------------ input --
func _unhandled_input(e: InputEvent) -> void:
	if e is InputEventKey and e.pressed and not e.echo:
		pressed.append(e.physical_keycode)
	elif e is InputEventJoypadButton and e.pressed:
		pad_pressed.append(e.button_index)
	elif e is InputEventJoypadMotion and (e.axis == JOY_AXIS_TRIGGER_LEFT or e.axis == JOY_AXIS_TRIGGER_RIGHT):
		var on: bool = e.axis_value > 0.6
		if on and not trig[e.axis]: pad_pressed.append(100 + e.axis)      # a trigger pulled counts as a press
		trig[e.axis] = on
	elif e is InputEventMouseButton:
		if e.button_index == MOUSE_BUTTON_LEFT: dragging = e.pressed
		elif e.button_index == MOUSE_BUTTON_WHEEL_UP and e.pressed: cam_dist = clampf(cam_dist * 0.9, 1.6, 12.0)
		elif e.button_index == MOUSE_BUTTON_WHEEL_DOWN and e.pressed: cam_dist = clampf(cam_dist * 1.11, 1.6, 12.0)
	elif e is InputEventMouseMotion and dragging:
		cam_yaw -= e.relative.x * 0.006
		cam_pitch = clampf(cam_pitch + e.relative.y * 0.004, -0.25, 1.25)


func _input_state(dt: float) -> Dictionary:
	var fwd := 0.0
	var side := 0.0
	if Input.is_physical_key_pressed(KEY_W) or Input.is_physical_key_pressed(KEY_UP): fwd += 1.0
	if Input.is_physical_key_pressed(KEY_S) or Input.is_physical_key_pressed(KEY_DOWN): fwd -= 1.0
	if Input.is_physical_key_pressed(KEY_D) or Input.is_physical_key_pressed(KEY_RIGHT): side += 1.0
	if Input.is_physical_key_pressed(KEY_A) or Input.is_physical_key_pressed(KEY_LEFT): side -= 1.0
	var run := Input.is_physical_key_pressed(KEY_SHIFT)
	var jump := pressed.has(KEY_SPACE)
	var jump_held := Input.is_physical_key_pressed(KEY_SPACE) or dev_hold_jump
	# a gamepad: left stick moves, right stick turns the camera, A jumps, B runs
	if Input.get_connected_joypads().size() > 0:
		var lx := Input.get_joy_axis(0, JOY_AXIS_LEFT_X)
		var ly := Input.get_joy_axis(0, JOY_AXIS_LEFT_Y)
		if absf(lx) > 0.18: side += lx
		if absf(ly) > 0.18: fwd -= ly
		var rx := Input.get_joy_axis(0, JOY_AXIS_RIGHT_X)
		var ry := Input.get_joy_axis(0, JOY_AXIS_RIGHT_Y)
		if absf(rx) > 0.18: cam_yaw -= rx * dt * 2.6
		if absf(ry) > 0.18: cam_pitch = clampf(cam_pitch + ry * dt * 1.6, -0.25, 1.25)
		run = run or Input.is_joy_button_pressed(0, JOY_BUTTON_B) or Vector2(lx, ly).length() > 0.92
		jump_held = jump_held or Input.is_joy_button_pressed(0, JOY_BUTTON_A)
	if shot_mode == "walk": fwd = 1.0
	if shot_mode == "run":
		fwd = 1.0
		run = true
	var m := Vector2(fwd, side).length()
	if m > 1.0:
		fwd /= m
		side /= m
	var x := -sin(cam_yaw) * fwd + cos(cam_yaw) * side
	var z := -cos(cam_yaw) * fwd - sin(cam_yaw) * side
	for code in pressed:
		match code:
			KEY_1: tt.toggle_item()
			KEY_2: tt.toggle_hat()
			KEY_F: tt.toggle_open()
			KEY_R: tt.cycle_tilt()
			KEY_Q: tt.toggle_carry()
			KEY_E: tt.trick()
			KEY_G: _interact()
			KEY_Z: tt.play("wave")
			KEY_X: tt.play("point")
			KEY_C: tt.play("curtsy")
			KEY_V: tt.play("spin")
			KEY_B: tt.play("peace")
			KEY_T: tt.hat_gesture()     # the hat tip, then (next press) the hat off and a bow
			KEY_J: _toggle_skeleton()
			KEY_L: _set_lighting(not rich_light)
			KEY_H: hud_help.visible = not hud_help.visible
			KEY_3: tt.face_base = "smug"
			KEY_4: tt.face_base = "smile"
			KEY_5: tt.face_base = "happy"
			KEY_6: tt.face_base = "pout"
			KEY_7: tt.face_base = "surprised"
	pressed.clear()
	# a gamepad: X trick, Y open/close, LB umbrella, LT tilt, RT carry, d-pad emotes, R3 sit, Start help
	for b in pad_pressed:
		match b:
			JOY_BUTTON_X: tt.trick()
			JOY_BUTTON_Y: tt.toggle_open()
			JOY_BUTTON_LEFT_SHOULDER: tt.toggle_item()
			104: tt.cycle_tilt()
			105: tt.toggle_carry()
			JOY_BUTTON_DPAD_UP: tt.play("wave")
			JOY_BUTTON_DPAD_RIGHT: tt.play("point")
			JOY_BUTTON_DPAD_DOWN: tt.play("curtsy")
			JOY_BUTTON_DPAD_LEFT: tt.play("spin")
			JOY_BUTTON_RIGHT_STICK: _interact()
			JOY_BUTTON_START: hud_help.visible = not hud_help.visible
	pad_pressed.clear()
	return { "x": x, "z": z, "run": run, "jump": jump, "jump_held": jump_held }


# ------------------------------------------------------------------- loop --
func _process(dt: float) -> void:
	dt = minf(dt, 0.05)
	var inp := _input_state(dt)
	if shot_path != "": _dev_commands()
	if not travel.is_empty():
		_travel_update(dt)
		inp = { "x": 0.0, "z": 0.0, "run": false, "jump": false, "jump_held": false }
	tt.update(dt, inp)
	if level == "garden": _summon_update(dt)
	else: town.update(dt, tt.position)
	_update_hud()
	for c in clouds:
		c.position.x += dt * 1.2
		if c.position.x > 200.0: c.position.x -= 400.0
	garden_t += dt
	for f in floaters:
		var n: Node3D = f.node
		n.position.y = f.y0 + sin(garden_t * 0.6 + f.ph) * 0.45
		n.rotation.y += dt * f.spin
	_update_camera(dt)
	frames += 1
	if frames == 40: bench_us = Time.get_ticks_usec()
	if shot_path != "" and frames == shot_at:
		if shot_at > 40: print("fps %.1f" % ((shot_at - 40) / ((Time.get_ticks_usec() - bench_us) / 1e6)))
		print("tris %.2fM  draws %d  objects %d" % [RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_PRIMITIVES_IN_FRAME) / 1e6,
			RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_DRAW_CALLS_IN_FRAME),
			RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_OBJECTS_IN_FRAME)])
		var img := get_viewport().get_texture().get_image()
		img.save_png(shot_path)
		get_tree().quit()


func _update_camera(dt: float) -> void:
	var want := Vector3(tt.position.x, tt.position.y * 0.6 + 1.05 + shot_camy, tt.position.z)
	cam_tgt.x += (want.x - cam_tgt.x) * (1.0 - exp(-12.0 * dt))
	cam_tgt.z += (want.z - cam_tgt.z) * (1.0 - exp(-12.0 * dt))
	cam_tgt.y += (want.y - cam_tgt.y) * (1.0 - exp(-6.0 * dt))
	if shot_cam != Vector3.ZERO:
		cam_yaw = tt.yaw + shot_cam.x
		cam_pitch = shot_cam.y
		cam_dist = shot_cam.z
	var cp := cos(cam_pitch)
	var p := cam_tgt + Vector3(sin(cam_yaw) * cp, sin(cam_pitch), cos(cam_yaw) * cp) * cam_dist
	p.y = maxf(p.y, 0.15)
	if level == "town":                                 # in the town the camera comes in toward her rather than into a house
		var f := 1.0
		for k in range(1, 13):
			var q := cam_tgt.lerp(p, k / 12.0)
			if q.y < 10.5 and Vector2(town._in_walk(q, 0.25).x - q.x, town._in_walk(q, 0.25).z - q.z).length() > 0.01:
				f = (k - 1) / 12.0
				break
		if f < 1.0:                                     # blocked: come in (not closer than a metre), rise to look over her
			var full := p.distance_to(cam_tgt)
			var keep := maxf(f * full, minf(1.0, full))
			p = cam_tgt + (p - cam_tgt).normalized() * keep
			p.y += (1.0 - f) * 1.3
			var q2: Vector3 = town._in_walk(p, 0.12)
			if p.y < 10.5:
				p.x = q2.x
				p.z = q2.z
	cam.look_at_from_position(p, cam_tgt, Vector3.UP)


# -------------------------------------------------------------------- HUD --
## Plum panels with a thin lilac rule, like the character sheet: the name plate (top left), what she's holding and her
## face (top right), the controls (bottom left), a prompt near seats, and a note in the skeleton view.
func _hud() -> void:
	ui_font = SystemFont.new()
	(ui_font as SystemFont).font_names = PackedStringArray(["Consolas", "Cascadia Mono", "monospace"])
	title_font = SystemFont.new()
	(title_font as SystemFont).font_names = PackedStringArray(["Georgia", "Times New Roman", "serif"])
	(title_font as SystemFont).font_weight = 700
	var layer := CanvasLayer.new()
	add_child(layer)
	# name plate
	var plate := _panel()
	plate.position = Vector2(18, 14)
	layer.add_child(plate)
	var pv := VBoxContainer.new()
	plate.add_child(pv)
	pv.add_child(_label("Trap Trick", 28, Color("efe3ff"), title_font))
	hud_place = _label("the Wonder Garden", 13, Color("cdb9f2"), title_font)
	pv.add_child(hud_place)
	var suits := HBoxContainer.new()
	pv.add_child(suits)
	for k in [["♥", "dc2741"], ["♣", "e9e3f6"], ["♦", "dc2741"], ["♠", "e9e3f6"]]: suits.add_child(_label(k[0], 14, Color(k[1])))
	# state slots, top right
	var slots := HBoxContainer.new()
	slots.anchor_left = 1.0
	slots.anchor_right = 1.0
	slots.offset_left = -330
	slots.offset_right = -18
	slots.offset_top = 14
	slots.alignment = BoxContainer.ALIGNMENT_END
	slots.add_theme_constant_override("separation", 8)
	layer.add_child(slots)
	hud_umb_box = _panel()
	slots.add_child(hud_umb_box)
	var uv := VBoxContainer.new()
	hud_umb_box.add_child(uv)
	uv.add_child(_label("UMBRELLA", 11, Color("b9a9de")))
	hud_umb = _label("Away", 15, Color("f1eaff"))
	uv.add_child(hud_umb)
	var face_box := _panel()
	slots.add_child(face_box)
	var fv := VBoxContainer.new()
	face_box.add_child(fv)
	fv.add_child(_label("FACE", 11, Color("b9a9de")))
	hud_face = _label("smug", 15, Color("f1eaff"))
	fv.add_child(hud_face)
	var light_box := _panel()
	slots.add_child(light_box)
	var lv := VBoxContainer.new()
	light_box.add_child(lv)
	lv.add_child(_label("LIGHT", 11, Color("b9a9de")))
	hud_light = _label("Rich", 15, Color("f1eaff"))
	lv.add_child(hud_light)
	# controls
	hud_help = _panel()
	hud_help.anchor_top = 1.0
	hud_help.anchor_bottom = 1.0
	hud_help.offset_left = 18
	hud_help.offset_bottom = -16
	hud_help.grow_vertical = Control.GROW_DIRECTION_BEGIN
	layer.add_child(hud_help)
	var hv := VBoxContainer.new()
	hud_help.add_child(hv)
	hv.add_child(_label("Controls  ·  H hides this", 15, Color("e6d8ff"), title_font))
	var grid := GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 26)
	hv.add_child(grid)
	for line in [
		"W A S D  walk           ", "Shift  run    Space  jump",
		"Drag  camera   Wheel  zoom", "1  umbrella   2  hat off / on",
		"F  open / close   R  tilt", "Q  carry / hold   E  trick",
		"Z  wave   X  point   C  curtsy", "V  spin   B  pose   T  tip / bow",
		"G  sit · talk · door   3-7 face", "J  skeleton   L  lighting",
	]: grid.add_child(_label(line, 13, Color("d8ccf2")))
	hv.add_child(_label("Umbrella open: jump, then hold Space to float down", 13, Color("f0c6e2")))
	# the prompt and the skeleton note
	hud_prompt_box = _panel()
	hud_prompt_box.anchor_left = 0.5
	hud_prompt_box.anchor_right = 0.5
	hud_prompt_box.anchor_top = 1.0
	hud_prompt_box.anchor_bottom = 1.0
	hud_prompt_box.offset_top = -100
	hud_prompt_box.grow_horizontal = Control.GROW_DIRECTION_BOTH
	hud_prompt_box.visible = false
	layer.add_child(hud_prompt_box)
	hud_prompt = _label("", 15, Color("f1eaff"))
	hud_prompt_box.add_child(hud_prompt)
	hud_skel = _panel(Color(0.04, 0.07, 0.16, 0.85), Color("5aa6e0"))
	hud_skel.anchor_left = 0.5
	hud_skel.anchor_right = 0.5
	hud_skel.offset_top = 16
	hud_skel.grow_horizontal = Control.GROW_DIRECTION_BOTH
	hud_skel.visible = false
	hud_skel.add_child(_label("Skeleton view  ·  J to leave", 14, Color("bfe6ff")))
	layer.add_child(hud_skel)


func _panel(bg := Color(0.1, 0.08, 0.19, 0.84), border := Color("8a74c9")) -> PanelContainer:
	var p := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.border_color = border
	sb.set_border_width_all(1)
	sb.content_margin_left = 12
	sb.content_margin_right = 12
	sb.content_margin_top = 7
	sb.content_margin_bottom = 8
	p.add_theme_stylebox_override("panel", sb)
	return p


func _label(text: String, size: int, color: Color, font: Font = null) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	l.add_theme_font_override("font", font if font else ui_font)
	return l


func _update_hud() -> void:
	var st: Dictionary = tt.status()
	var where := ""
	if travel.is_empty():
		if level == "town" and town.near_door(tt.position): where = "door"
		elif level == "garden" and arrived and Vector2(tt.position.x, tt.position.z).length() < 2.2 and not st.near and not st.seat: where = "circle"
		elif level == "town" and town.near_person(tt.position): where = "talk"
	var key := str(st) + str(skel) + str(rich_light) + where + level
	if key == hud_last: return
	hud_last = key
	hud_umb.text = st.umbrella
	hud_face.text = st.face
	hud_light.text = "Rich" if rich_light else "Simple"
	var sb := hud_umb_box.get_theme_stylebox("panel") as StyleBoxFlat
	sb.border_color = Color("8a74c9") if st.umbrella != "Away" else Color("4a3d73")
	var prompt := ""
	if st.near: prompt = "G   Sit on the toadstool" if level == "garden" else "G   Sit on the bench"
	elif st.seat: prompt = "G   Stand up"
	elif where == "door": prompt = "G   Open the door"
	elif where == "circle": prompt = "G   Return to the town"
	elif where == "talk": prompt = "G   Talk"
	elif st.floating: prompt = "Floating  -  hold Space"
	hud_prompt.text = prompt
	hud_prompt_box.visible = prompt != ""
	hud_skel.visible = skel


func _toggle_skeleton() -> void:
	skel = not skel
	tt.set_skeleton(skel)


## Dev: play the --do commands, one every 25 frames from frame 20 (for screenshots).
func _dev_commands() -> void:
	var i := frames - 20
	if i < 0 or i % 25 != 0 or i / 25 >= shot_do.size(): return
	match shot_do[i / 25]:
		"umbrella": tt.toggle_item()
		"open": tt.toggle_open()
		"tilt": tt.cycle_tilt()
		"carry": tt.toggle_carry()
		"trick": tt.trick()
		"sit":
			var s_: Dictionary = seats()[0]
			tt.position = Vector3(s_.x + sin(s_.yaw) * 0.8, 0, s_.z + cos(s_.yaw) * 0.8)
			tt.sit_toggle()
		"jump": pressed.append(KEY_SPACE)
		"float":
			pressed.append(KEY_SPACE)
			dev_hold_jump = true
		"skeleton": _toggle_skeleton()
		"light": _set_lighting(not rich_light)
		"nohat": tt.toggle_hat()
		"door":
			var d: Dictionary = bake.town.door
			tt.position = Vector3(d.x + 1.0, 0, d.z)
			_interact()
		"talk": town.talk(tt.position)
		"home": _interact()
		var a: tt.play(a)

