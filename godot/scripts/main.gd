extends Node3D
## Trap Trick -- the main scene. Builds the garden (sky, sun, fog, ground, the baked scenery), Trap Trick, the follow
## camera and the HUD at start, and reads the keyboard, mouse and gamepad.
##
## Dev: run with  -- --shot=<file.png> [--walk|--run] [--do=umbrella,open,wave...] [--at=150] [--cam=yaw,pitch,dist]
## to play a few commands, save a screenshot at frame --at and quit.

const BAKE_PATH := "res://assets/bake.json"
const SUN_DIR := Vector3(0.55, 1.0, 0.42)

var bake: Dictionary
var tt: Node3D                       # Trap Trick
var fx: Node3D                       # the effects
var cam: Camera3D
var sun: DirectionalLight3D
var env: Environment
var rich_light := true            # L switches between the rich desktop lighting and the web version's simple look
var clouds: Array[Node3D] = []
var colliders: Array = []
var bound := 92.0
var lit_mat: StandardMaterial3D
var glow_mat: StandardMaterial3D

# the follow camera
var cam_yaw := PI + 0.35
var cam_pitch := 0.16
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
		elif a.begins_with("--no="): light_off = a.substr(5).split(",")
		elif a.begins_with("--at="): shot_at = int(a.substr(5))
		elif a.begins_with("--do="): shot_do = a.substr(5).split(",")
		elif a.begins_with("--cam="):
			var c := a.substr(6).split(",")
			shot_cam = Vector3(float(c[0]), float(c[1]), float(c[2]))
	if shot_path != "": DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)   # so the frame rate is real
	_materials()
	_environment()
	_ground()
	_scenery()
	fx = preload("res://scripts/fx.gd").new()
	add_child(fx)
	fx.setup(self)
	tt = preload("res://scripts/trap_trick.gd").new()
	add_child(tt)
	tt.setup(bake, self)
	tt.position = Vector3(0, 0, 3.5)
	tt.yaw = PI
	tt.t_yaw = PI
	_set_lighting(rich_light)
	cam = Camera3D.new()
	cam.fov = 50.0
	cam.near = 0.05
	cam.far = 900.0
	add_child(cam)
	cam.current = true
	_hud()
	_update_camera(1.0)


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


func _environment() -> void:
	var sky_mat := ProceduralSkyMaterial.new()
	sky_mat.sky_top_color = Color("4f8fe0")
	sky_mat.sky_horizon_color = Color("bfe0ff")
	sky_mat.ground_horizon_color = Color("bfe0ff")
	sky_mat.ground_bottom_color = Color("6fa35a")
	var sky := Sky.new()
	sky.sky_material = sky_mat
	env = Environment.new()
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	# lit like the web version: a soft, near-neutral fill and a warm sun, no film tonemapping (it washes the colours out)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.8, 0.83, 0.92)
	env.ambient_light_energy = 0.55
	env.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	env.fog_enabled = true
	env.fog_light_color = Color("cfe4ff")
	env.fog_density = 0.0025
	env.fog_sky_affect = 0.0
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)
	sun = DirectionalLight3D.new()
	sun.light_color = Color("fff2dc")
	sun.light_energy = 0.95
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 45.0
	sun.shadow_blur = 1.5
	sun.transform = Transform3D(Basis.looking_at(-SUN_DIR.normalized(), Vector3.UP), Vector3.ZERO)
	add_child(sun)
	# the rich lighting's settings (switched on and off in _set_lighting)
	env.ambient_light_sky_contribution = 0.4
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
## light faintly tinted by the sky (bluer from above, greener from the lawn below), a glow around the gems and the lamp
## heads, and haze toward the far hills. It roughly doubles the frame time (Intel UHD, 1280x720: about 70 fps vs 130).
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
	# the glowing voxels go past white, so the glow picks out only the gems and lamp heads (nothing else gets that bright)
	var k := 1.6 if on.call("glow") else 1.0
	for m: BaseMaterial3D in [glow_mat, tt.mats[1]]:
		m.albedo_color = Color(k, k, k, m.albedo_color.a)


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
	add_child(g)
	var far_plane := PlaneMesh.new()
	far_plane.size = Vector2(900, 900)
	var fm := StandardMaterial3D.new()
	fm.albedo_color = Color("67b346")
	fm.roughness = 1.0
	var f := MeshInstance3D.new()
	f.mesh = far_plane
	f.material_override = fm
	f.position.y = -0.02
	add_child(f)


## The baked scenery: every prop placed as in the web version; the grass tufts and little flowers as MultiMeshes.
func _scenery() -> void:
	var w: Node3D = load("res://assets/world.glb").instantiate()
	add_child(w)
	voxelize(w)
	var by_name := {}
	for n in w.find_children("*", "Node3D", true, false): by_name[String(n.name)] = n
	for i in int(bake.world.clouds):
		if by_name.has("cloud_%d" % i):
			var c: Node3D = by_name["cloud_%d" % i]
			clouds.append(c)
			for mi in [c] + c.find_children("*", "GeometryInstance3D", true, false):
				if mi is GeometryInstance3D: mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF   # as on the web: no shadows from the clouds
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
		add_child(mmi)


## Push a point out of the scenery's collision circles, and keep it inside the garden.
func collide(p: Vector3, r: float) -> Vector3:
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
	return bake.world.seats


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
			KEY_F: tt.toggle_open()
			KEY_R: tt.cycle_tilt()
			KEY_Q: tt.toggle_carry()
			KEY_E: tt.trick()
			KEY_G: tt.sit_toggle()
			KEY_Z: tt.play("wave")
			KEY_X: tt.play("point")
			KEY_C: tt.play("curtsy")
			KEY_V: tt.play("spin")
			KEY_B: tt.play("peace")
			KEY_T: tt.play("hatTip")
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
			JOY_BUTTON_RIGHT_STICK: tt.sit_toggle()
			JOY_BUTTON_START: hud_help.visible = not hud_help.visible
	pad_pressed.clear()
	return { "x": x, "z": z, "run": run, "jump": jump, "jump_held": jump_held }


# ------------------------------------------------------------------- loop --
func _process(dt: float) -> void:
	dt = minf(dt, 0.05)
	var inp := _input_state(dt)
	if shot_path != "": _dev_commands()
	tt.update(dt, inp)
	_update_hud()
	for c in clouds:
		c.position.x += dt * 1.2
		if c.position.x > 200.0: c.position.x -= 400.0
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
	var want := Vector3(tt.position.x, tt.position.y * 0.6 + 1.05, tt.position.z)
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
		"Drag  camera   Wheel  zoom", "1  umbrella out / away",
		"F  open / close   R  tilt", "Q  carry / hold   E  trick",
		"Z  wave   X  point   C  curtsy", "V  spin   B  pose   T  hat tip",
		"G  sit (crates)   3-7  face", "J  skeleton   L  lighting",
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
	var key := str(st) + str(skel) + str(rich_light)
	if key == hud_last: return
	hud_last = key
	hud_umb.text = st.umbrella
	hud_face.text = st.face
	hud_light.text = "Rich" if rich_light else "Simple"
	var sb := hud_umb_box.get_theme_stylebox("panel") as StyleBoxFlat
	sb.border_color = Color("8a74c9") if st.umbrella != "Away" else Color("4a3d73")
	var prompt := ""
	if st.near: prompt = "G   Sit on the crate"
	elif st.seat: prompt = "G   Stand up"
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
		var a: tt.play(a)

