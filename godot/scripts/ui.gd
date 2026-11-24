extends CanvasLayer
## The story's screen: film bars, speech, titles, the objective and the prompt, the school clock, the incantation ring,
## things to read, and the menus. Dark green panels with a thin gold rule, the academy's colours.

const GOLD := Color("d0a850")
const CREAM := Color("f6eedd")
const PANEL := Color(0.055, 0.1, 0.1, 0.88)

# how long a finished line stays up before the next comes by itself: a moment, and a while for every letter in it
const READ_BASE := 1.5
const READ_PER := 0.045

var main: Node3D
var story: Node3D
var serif: Font
var serif_b: Font
var bar_t: ColorRect
var bar_b: ColorRect
var bars := 0.0
var bars_to := 0.0
var box: PanelContainer
var box_name: Label
var box_name_p: PanelContainer
var box_text: Label
var box_more: Label
var shown := 0.0
var line_len := 0
var line_t := 0.0
var line_on := false
var line_auto := true
var line_voice := ""
var blip := 0.0
var black: ColorRect
var title_l: Label
var sub_l: Label
var place_l: Label
var place_t := 0.0
var obj_p: PanelContainer
var obj_l: Label
var obj_t := 99.0
var prompt_p: PanelContainer
var prompt_l: Label
var clock_p: PanelContainer
var clock_l: Label
var period_l: Label
var bell_l: Label
var bell_t := 99.0
var read_p: PanelContainer
var read_t: Label
var read_b: Label
var skip_l: Label
var ring: Control
var menu: Control
var menu_box: VBoxContainer
var menu_items: Array = []
var menu_i := 0
var menu_shade: ColorRect
var toast_l: Label
var toast_t := 0.0
var speakers := {}

var seen := 0.0                       # (in the night's sneaking)
# the incantation ring
var spell := {}


func setup(m: Node3D, s: Node3D) -> void:
	main = m
	story = s
	layer = 8
	serif = SystemFont.new()
	(serif as SystemFont).font_names = PackedStringArray(["Georgia", "Cambria", "Times New Roman", "serif"])
	serif_b = SystemFont.new()
	(serif_b as SystemFont).font_names = PackedStringArray(["Georgia", "Cambria", "Times New Roman", "serif"])
	(serif_b as SystemFont).font_weight = 700
	bar_t = _rect(Color.BLACK)
	bar_b = _rect(Color.BLACK)
	for b in [bar_t, bar_b]:
		b.anchor_left = 0.0
		b.anchor_right = 1.0
	bar_b.anchor_top = 1.0
	bar_b.anchor_bottom = 1.0
	black = _rect(Color(0, 0, 0, 0))
	black.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	# speech
	box = _panel()
	box.anchor_left = 0.5
	box.anchor_right = 0.5
	box.anchor_top = 1.0
	box.anchor_bottom = 1.0
	box.offset_left = -440
	box.offset_right = 440
	box.offset_top = -100
	box.offset_bottom = -16
	add_child(box)
	box_text = _label("", 21, CREAM)
	box_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	box_text.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	box.add_child(box_text)
	box_name_p = _panel(Color("1c3f3a"))
	box_name_p.anchor_left = 0.5
	box_name_p.anchor_right = 0.5
	box_name_p.anchor_top = 1.0
	box_name_p.anchor_bottom = 1.0
	box_name_p.offset_left = -424
	box_name_p.offset_right = -424
	box_name_p.offset_top = -126
	box_name_p.offset_bottom = -96
	box_name_p.grow_horizontal = Control.GROW_DIRECTION_END
	add_child(box_name_p)
	box_name = _label("", 16, Color("f4dfa8"), serif_b)
	box_name_p.add_child(box_name)
	box_more = _label("▾", 18, GOLD)
	box_more.anchor_left = 0.5
	box_more.anchor_right = 0.5
	box_more.anchor_top = 1.0
	box_more.anchor_bottom = 1.0
	box_more.offset_left = 408
	box_more.offset_top = -48
	add_child(box_more)
	# titles
	title_l = _label("", 64, CREAM, serif_b)
	_center(title_l, -70)
	sub_l = _label("", 24, Color("e8d8ac"))
	_center(sub_l, 22)
	place_l = _label("", 26, CREAM, serif_b)
	place_l.anchor_top = 1.0
	place_l.anchor_bottom = 1.0
	place_l.offset_left = 56
	place_l.offset_top = -200
	_outline(place_l)
	add_child(place_l)
	# objective, prompt, clock
	obj_p = _panel()
	obj_p.position = Vector2(22, 20)
	add_child(obj_p)
	obj_l = _label("", 18, CREAM)
	obj_p.add_child(obj_l)
	prompt_p = _panel()
	prompt_p.anchor_left = 0.5
	prompt_p.anchor_right = 0.5
	prompt_p.anchor_top = 1.0
	prompt_p.anchor_bottom = 1.0
	prompt_p.offset_top = -92
	prompt_p.offset_bottom = -54
	prompt_p.grow_horizontal = Control.GROW_DIRECTION_BOTH
	add_child(prompt_p)
	prompt_l = _label("", 18, CREAM)
	prompt_p.add_child(prompt_l)
	clock_p = _panel()
	clock_p.anchor_left = 1.0
	clock_p.anchor_right = 1.0
	clock_p.offset_left = -250
	clock_p.offset_right = -22
	clock_p.offset_top = 20
	clock_p.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	add_child(clock_p)
	var cv := VBoxContainer.new()
	cv.add_theme_constant_override("separation", 0)
	clock_p.add_child(cv)
	clock_l = _label("", 22, Color("f4dfa8"), serif_b)
	clock_l.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	cv.add_child(clock_l)
	period_l = _label("", 15, CREAM)
	period_l.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	cv.add_child(period_l)
	bell_l = _label("", 30, Color("f8e6b0"), serif_b)
	bell_l.anchor_left = 0.0
	bell_l.anchor_right = 1.0
	bell_l.offset_top = 92
	bell_l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_outline(bell_l)
	add_child(bell_l)
	toast_l = _label("", 20, CREAM)
	toast_l.anchor_right = 1.0
	toast_l.anchor_top = 1.0
	toast_l.anchor_bottom = 1.0
	toast_l.offset_top = -146
	toast_l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_outline(toast_l)
	add_child(toast_l)
	# something to read
	read_p = _panel(Color("efe2c4"), Color("8a6a3a"))
	read_p.anchor_left = 0.5
	read_p.anchor_right = 0.5
	read_p.anchor_top = 0.5
	read_p.anchor_bottom = 0.5
	read_p.offset_left = -330
	read_p.offset_right = 330
	read_p.offset_top = -230
	read_p.grow_vertical = Control.GROW_DIRECTION_BOTH
	add_child(read_p)
	var rv := VBoxContainer.new()
	rv.add_theme_constant_override("separation", 10)
	read_p.add_child(rv)
	read_t = _label("", 26, Color("5a2c24"), serif_b)
	read_t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	rv.add_child(read_t)
	read_b = _label("", 18, Color("3a2c28"))
	read_b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	read_b.custom_minimum_size = Vector2(620, 0)
	rv.add_child(read_b)
	var rc := _label("E to close", 14, Color("8a6a3a"))
	rc.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	rv.add_child(rc)
	skip_l = _label("hold Tab to skip", 14, Color(1, 1, 1, 0.55))
	skip_l.anchor_left = 1.0
	skip_l.anchor_right = 1.0
	skip_l.offset_left = -170
	skip_l.offset_top = 12
	add_child(skip_l)
	ring = Control.new()
	ring.set_anchors_preset(Control.PRESET_FULL_RECT)
	ring.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ring.draw.connect(_draw_ring)
	add_child(ring)
	# the menu
	menu_shade = _rect(Color(0.02, 0.04, 0.05, 0.0))
	menu_shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	menu = Control.new()
	menu.set_anchors_preset(Control.PRESET_FULL_RECT)
	menu.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(menu)
	menu_box = VBoxContainer.new()
	menu_box.anchor_left = 0.0
	menu_box.anchor_top = 0.5
	menu_box.offset_left = 110
	menu_box.offset_top = -10
	menu_box.add_theme_constant_override("separation", 8)
	menu.add_child(menu_box)
	for n in [box, box_name_p, box_more, obj_p, prompt_p, clock_p, read_p, skip_l, menu]: n.visible = false


func _rect(c: Color) -> ColorRect:
	var r := ColorRect.new()
	r.color = c
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(r)
	return r


func _panel(bg := PANEL, border := GOLD) -> PanelContainer:
	var p := PanelContainer.new()
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.border_color = border
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(2)
	sb.content_margin_left = 18
	sb.content_margin_right = 18
	sb.content_margin_top = 8
	sb.content_margin_bottom = 9
	p.add_theme_stylebox_override("panel", sb)
	return p


func _label(text: String, size: int, c: Color, f: Font = null) -> Label:
	var l := Label.new()
	l.text = text
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", c)
	l.add_theme_font_override("font", f if f else serif)
	return l


func _outline(l: Label) -> void:
	l.add_theme_color_override("font_outline_color", Color(0.03, 0.05, 0.06, 0.85))
	l.add_theme_constant_override("outline_size", 8)


func _center(l: Label, y: float) -> void:
	l.anchor_left = 0.0
	l.anchor_right = 1.0
	l.anchor_top = 0.5
	l.anchor_bottom = 0.5
	l.offset_top = y
	l.offset_bottom = y + 80
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	l.modulate.a = 0.0
	_outline(l)
	add_child(l)


# ----------------------------------------------------------------- speech --
func start_line(who: String, text: String, auto := true, voice := "") -> void:
	box.visible = true
	box_name_p.visible = who != ""
	box_name.text = who
	box_name_p.size.x = 0.0
	box_text.text = text
	box_text.visible_characters = 0
	shown = 0.0
	line_len = text.length()
	line_t = 0.0
	line_on = true
	line_auto = auto
	line_voice = voice
	box_more.visible = false


func end_line() -> void:
	line_on = false
	box.visible = false
	box_name_p.visible = false
	box_more.visible = false


func advance() -> void:
	if not line_on: return
	if shown < line_len: shown = line_len
	else: line_on = false


func title(t_: String, s_: String) -> void:
	title_l.text = t_
	sub_l.text = s_


func place(text: String) -> void:
	place_l.text = text
	place_t = 4.5


func objective(text: String) -> void:
	if text != "" and text != obj_l.text: main.sfx("obj")
	obj_l.text = text
	obj_p.visible = text != ""
	obj_p.size = Vector2.ZERO
	obj_t = 0.0


func prompt(text: String) -> void:
	if prompt_l.text == text and prompt_p.visible == (text != ""): return
	prompt_l.text = text
	prompt_p.visible = text != ""
	prompt_p.size.x = 0.0


func read(t_: String, b_: String) -> void:
	read_t.text = t_
	read_b.text = b_
	read_p.size = Vector2.ZERO
	read_p.visible = true


func bell_text(text: String) -> void:
	bell_l.text = text
	bell_t = 0.0


func toast(text: String) -> void:
	toast_l.text = text
	toast_t = 2.6 + text.length() * 0.04


func clock(on: bool, time := "", what := "") -> void:
	clock_p.visible = on
	clock_l.text = time
	period_l.text = what


func update(dt: float) -> void:
	bars = move_toward(bars, bars_to, dt * 1.8)
	var h := smoothstep(0.0, 1.0, bars) * 74.0
	bar_t.offset_bottom = h
	bar_b.offset_top = -h
	skip_l.visible = bars_to > 0.5 and not menu.visible
	if line_on:
		var before := int(shown)
		shown = minf(shown + dt * 36.0, line_len)
		box_text.visible_characters = int(shown)
		if int(shown) > before and shown < line_len:
			blip -= dt
			if blip <= 0.0 and line_voice != "":
				blip = 0.075
				main.sfx("voice_" + line_voice)
		if shown >= line_len:
			line_t += dt
			box_more.visible = fmod(line_t, 0.9) < 0.55
			if line_auto and line_t > READ_BASE + line_len * READ_PER: line_on = false
	obj_t += dt
	obj_l.add_theme_color_override("font_color", Color("f8e6b0").lerp(CREAM, clampf(obj_t / 2.0, 0.0, 1.0)))
	place_t -= dt
	place_l.modulate.a = clampf(place_t, 0.0, 1.0) * clampf((4.5 - place_t) * 1.5, 0.0, 1.0)
	bell_t += dt
	bell_l.modulate.a = clampf(bell_t * 2.0, 0.0, 1.0) * clampf(4.6 - bell_t, 0.0, 1.0)
	toast_t -= dt
	toast_l.offset_top = -330.0 if not spell.is_empty() else -146.0
	toast_l.modulate.a = clampf(toast_t, 0.0, 1.0)
	if not spell.is_empty(): _spell_update(dt)


# ----------------------------------------------------------- incantations --
## Spell the words out: each syllable drifts to the ring; press its direction as it gets there. opts: speed, forgiving.
func spell_start(words: Array, opts := {}) -> void:
	spell = { "w": words, "i": 0, "t": -1.2, "hit": 0, "miss": 0, "gap": opts.get("gap", 0.85), "fx": [], "done": false, "wide": opts.get("wide", 0.24), "end": -1.0, "name": opts.get("name", ""), "flash": 0.0, "duel": opts.get("duel", null) }


func spell_key(dir: String) -> void:
	if spell.is_empty() or spell.done or spell.i >= spell.w.size(): return
	var off: float = absf(spell.t - spell.i * spell.gap)
	if spell.t < spell.i * spell.gap - 0.42: return
	if off <= spell.wide and spell.w[spell.i][1] == dir:
		spell.hit += 1
		spell.flash = 1.0
		spell.fx.append([spell.i, true])
		main.sfx("rune")
		_tell_duel(spell.i, true)
	else:
		spell.miss += 1
		spell.flash = -1.0
		spell.fx.append([spell.i, false])
		main.sfx("rune_bad")
		_tell_duel(spell.i, false)
	spell.i += 1


func _tell_duel(i: int, ok: bool) -> void:
	if spell.get("duel") != null: (spell.duel.cb as Callable).call(String(spell.w[i][2]) if spell.w[i].size() > 2 else "c", ok)


func _spell_update(dt: float) -> void:
	spell.t += dt
	spell.flash = move_toward(spell.flash, 0.0, dt * 3.0)
	if spell.i < spell.w.size() and spell.t > spell.i * spell.gap + spell.wide:
		spell.miss += 1
		spell.flash = -1.0
		spell.fx.append([spell.i, false])
		_tell_duel(spell.i, false)
		spell.i += 1
		main.sfx("rune_bad")
	if spell.i >= spell.w.size():
		if spell.end < 0.0: spell.end = 0.5
		spell.end -= dt
		if spell.end <= 0.0: spell.done = true
	ring.queue_redraw()


func spell_end() -> void:
	spell = {}
	ring.queue_redraw()


const ARROW := { "U": "↑", "D": "↓", "L": "←", "R": "→" }
const KEYN := { "U": "W", "D": "S", "L": "A", "R": "D" }


func _draw_ring() -> void:
	if seen > 0.01:
		var e := Vector2(ring.size.x * 0.5, 96)
		var col := Color("ffd88a").lerp(Color("ff5a4a"), seen)
		ring.draw_arc(e, 26, PI * 1.15, PI * 1.85, 24, col, 3.0, true)
		ring.draw_arc(e + Vector2(0, -16), 26, PI * 0.15, PI * 0.85, 24, col, 3.0, true)
		ring.draw_circle(e + Vector2(0, -8), 4.0 + seen * 4.0, col)
		ring.draw_rect(Rect2(e.x - 50, e.y + 14, 100, 5), Color(0, 0, 0, 0.5))
		ring.draw_rect(Rect2(e.x - 50, e.y + 14, 100 * seen, 5), col)
	if spell.is_empty(): return
	var sz := ring.size
	var c := Vector2(sz.x * 0.5, sz.y * 0.74)
	ring.draw_rect(Rect2(c.x - 420, c.y - 78, 840, 156), Color(0.03, 0.07, 0.07, 0.62))
	ring.draw_line(Vector2(c.x - 420, c.y - 78), Vector2(c.x + 420, c.y - 78), GOLD, 1.0)
	ring.draw_line(Vector2(c.x - 420, c.y + 78), Vector2(c.x + 420, c.y + 78), GOLD, 1.0)
	var fc := Color("f8e6b0") if spell.flash >= 0.0 else Color("e0604a")
	var r := 40.0 + absf(spell.flash) * 9.0
	ring.draw_arc(c, r, 0, TAU, 48, Color(GOLD).lerp(fc, absf(spell.flash)), 3.0, true)
	ring.draw_arc(c, r - 7, 0, TAU, 48, Color(GOLD, 0.35), 1.0, true)
	for k in 12:
		var a: float = k / 12.0 * TAU + spell.t * 0.5
		ring.draw_line(c + Vector2(cos(a), sin(a)) * (r + 4), c + Vector2(cos(a), sin(a)) * (r + 9), Color(GOLD, 0.6), 1.5)
	if spell.name != "": ring.draw_string(serif_b, c + Vector2(-400, -50), spell.name, HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color("e8d8ac"))
	if spell.get("duel") != null: _draw_duel(c)
	for i in spell.w.size():
		var x: float = c.x + (i * spell.gap - spell.t) * 190.0
		if x > c.x + 400 or x < c.x - 400: continue
		var kind: String = String(spell.w[i][2]) if spell.w[i].size() > 2 else ""
		var col: Color = { "g": Color("9ad4ff"), "c": Color("ffd88a"), "b": Color("ff9ab8") }.get(kind, CREAM)
		var up := 0.0
		for f in spell.fx:
			if f[0] == i:
				col = Color("8af0b0") if f[1] else Color("e0604a")
				up = 1.0
		var a := 1.0 - up * clampf((c.x - x) / 160.0, 0.0, 1.0)
		var p := Vector2(x, c.y)
		ring.draw_circle(p, 27.0, Color(0.07, 0.16, 0.15, 0.95 * a))
		ring.draw_arc(p, 27.0, 0, TAU, 32, Color(col, a), 2.0, true)
		ring.draw_string(serif_b, p + Vector2(-20, 9), ARROW[spell.w[i][1]], HORIZONTAL_ALIGNMENT_CENTER, 40, 26, Color(col, a))
		ring.draw_string(serif, p + Vector2(-60, 56), spell.w[i][0], HORIZONTAL_ALIGNMENT_CENTER, 120, 20, Color(col, a))
		ring.draw_string(serif, p + Vector2(-20, -38), KEYN[spell.w[i][1]], HORIZONTAL_ALIGNMENT_CENTER, 40, 14, Color(1, 1, 1, 0.5 * a))


# ------------------------------------------------------------------ menus --
## The two flames of a duel: each as tall as it has left to burn.
func _draw_duel(c: Vector2) -> void:
	for sd in [-1, 1]:
		var v: float = spell.duel.you if sd < 0 else spell.duel.foe
		var nm: String = spell.duel.name_you if sd < 0 else spell.duel.name_foe
		var b := c + Vector2(sd * 360.0, 44.0)
		ring.draw_rect(Rect2(b.x - 12, b.y, 24, 16), Color("f0e6ce"))
		var h: float = 18.0 + 74.0 * v
		var w: float = 9.0 + 13.0 * v
		var lean: float = sin(spell.t * 5.0 + sd) * 4.0 - sd * spell.duel.get("wind", 0.0) * 12.0
		if v > 0.01:
			var col := Color("ffb44a") if sd < 0 else Color("cfd8ff")
			ring.draw_colored_polygon(PackedVector2Array([b + Vector2(-w, -4), b + Vector2(-w * 0.7, -h * 0.45), b + Vector2(lean, -h), b + Vector2(w * 0.7, -h * 0.45), b + Vector2(w, -4)]), Color(col, 0.9))
			ring.draw_colored_polygon(PackedVector2Array([b + Vector2(-w * 0.5, -4), b + Vector2(lean * 0.5, -h * 0.6), b + Vector2(w * 0.5, -4)]), Color(1, 0.97, 0.85, 0.95))
		else: ring.draw_line(b + Vector2(0, -2), b + Vector2(0, -14), Color(0.3, 0.25, 0.25), 2.0)
		ring.draw_string(serif_b, b + Vector2(-70, 34), nm, HORIZONTAL_ALIGNMENT_CENTER, 140, 16, Color("f4dfa8"))
	for k in [["g", "shelter", -104], ["c", "call", 0], ["b", "breathe", 104]]:
		ring.draw_string(serif, c + Vector2(float(k[2]) - 50, 74), k[1], HORIZONTAL_ALIGNMENT_CENTER, 100, 14, Color({ "g": Color("9ad4ff"), "c": Color("ffd88a"), "b": Color("ff9ab8") }[k[0]], 0.8))


## How nearly one has been seen (0..1).
func watch(v: float) -> void:
	seen = v
	ring.queue_redraw()


func show_menu(items: Array, shade := 0.0) -> void:
	for c in menu_box.get_children(): c.queue_free()
	menu_items = []
	for it in items:
		var l := _label(it[1], 26, CREAM)
		_outline(l)
		menu_box.add_child(l)
		menu_items.append({ "id": it[0], "l": l })
	menu_i = 0
	menu.visible = true
	menu_shade.color.a = shade


func hide_menu() -> void:
	menu.visible = false
	menu_shade.color.a = 0.0


func menu_move(d: int) -> void:
	menu_i = posmod(menu_i + d, menu_items.size())
	main.sfx("tick")


func menu_update() -> void:
	for i in menu_items.size():
		var l: Label = menu_items[i].l
		var on := i == menu_i
		l.add_theme_color_override("font_color", Color("ffe7a6") if on else Color(0.95, 0.93, 0.86, 0.75))
		l.text = ("»  " if on else "    ") + l.text.trim_prefix("»  ").strip_edges()
	var mp := menu.get_local_mouse_position()
	for i in menu_items.size():
		var l: Label = menu_items[i].l
		if l.get_global_rect().has_point(mp) and Input.get_last_mouse_velocity().length() > 2.0: menu_i = i
