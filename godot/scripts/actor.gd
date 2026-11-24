extends Node3D
## One of the story's cast (baked from js/cast.js): a jointed voxel person who can stand, walk, sit, lie down, act and
## talk. Every joint is a damped spring easing to its pose, so things settle and overshoot a little; hands reach by IK;
## eyes blink, look and change expression; the mouth moves as they speak; capes, plaits and skirts swing.

signal arrived

var main: Node3D
var stage: Node3D                     # the place they're in (floors), or null
var who := ""
var spec: Dictionary
var body: Node3D                      # an inner node: hops, leans, lying down
var P := {}                           # joints
var F := {}                           # their frames
var V := {}                           # part -> { variant: node }
var act_v := {}                       # part -> active variant
var rest_y := 0.0                     # the hips' height standing
var q := {}                           # joint -> Quaternion
var w := {}                           # joint -> angular velocity
var ua := 0.2
var fa := 0.2
var vs := 0.024
var solid := true

# moving
var yaw := 0.0
var speed := 0.0
var walk_speed := 1.35
var path: Array = []                  # [{ p, door, warp }]
var phase := 0.0
var run_k := 0.0
var face_yaw = null                   # turn to this when standing
var vy := 0.0
var air := 0.0
var t := 0.0
var mount: Node3D                     # what they're riding (a swing): carried with it, tilt and all
var mount_at := Vector3.ZERO
var lod := 0                          # 0 full, 1 plain
var others: Array = []                # whoever else is about (story keeps it): walked round, never through
var jam := 0.0                        # how long there's been no way through
var narrow := false                   # in a doorway
var prog := Vector2(INF, 0.0)         # how near the next point they've come, and how long since they came nearer
var cm := {}                          # this frame's pose

# acting
var pose := "stand"
var pose_k := {}                      # extra numbers for the pose (seat height...)
var gest := ""
var gest_t := 0.0
var gest_d := 1.0
var look = null                       # a Node3D or a Vector3 to look at
var look_w := 0.0
var look_yp := Vector2.ZERO
var eyes := "open"
var mouth := "flat"
var eyes_hold := 0.0
var blink := 2.0
var talking := 0.0
var flap := 0.0
var hand := { "L": "", "R": "" }      # a hand shape held, or "" for the pose's own
var reach := { "L": null, "R": null } # a world point (Vector3) or Node3D to reach for
var reach_w := { "L": 0.0, "R": 0.0 }
var held := { "L": null, "R": null }
var shiver := 0.0
var swing := {}                       # secondary motion: part -> { v, a }
var prev_pos := Vector3.ZERO
var prev_yaw := 0.0
var vel := Vector3.ZERO
var bubble: Label3D
var bubble_t := 0.0
var top := 1.7
var eye_y := 1.5
var rng := RandomNumberGenerator.new()

const UPRIGHT := ["stand", "crossed", "hips", "read", "lean", "listen", "behind", "crouch", "shy", "proud", "cast", "letter", "carry", "kneel"]
const J := ["torso", "head", "uArmL", "uArmR", "fArmL", "fArmR", "handL", "handR", "thighL", "thighR", "shinL", "shinR", "footL", "footR"]


func setup(main_node: Node3D, cast_name: String, bake: Dictionary, src: Node3D) -> void:
	main = main_node
	who = cast_name
	name = cast_name
	spec = bake.cast[cast_name]
	rng.seed = hash(cast_name)
	body = Node3D.new()
	add_child(body)
	var rig: Node3D = src.duplicate()
	body.add_child(rig)
	for part in spec.parts:
		P[part] = rig.find_child("%s_%s" % [cast_name, part], true, false)
		F[part] = rig.find_child("%s_%s__frame" % [cast_name, part], true, false)
		q[part] = Quaternion.IDENTITY
		w[part] = Vector3.ZERO
	for part in spec.variants:
		V[part] = {}
		for v in spec.variants[part]:
			var n: Node3D = rig.find_child("%s_%s__v_%s" % [cast_name, part, v], true, false)
			if n:
				V[part][v] = n
				n.visible = false
		set_variant(part, String(spec.def[part]) if String(spec.def[part]) != "" else String(spec.variants[part][0]))
	rest_y = (F.hips as Node3D).position.y if F.has("hips") else 1.0
	vs = float(spec.s)
	if spec.info.has("ua"):
		ua = float(spec.info.ua)
		fa = float(spec.info.fa)
		top = float(spec.info.top)
		eye_y = float(spec.info.eye)
	for k in ["cape", "braidL1", "braidL2", "braidR1", "braidR2", "tuftL", "tuftR", "satchel", "tail"]:
		if P.has(k): swing[k] = { "a": Vector2.ZERO, "v": Vector2.ZERO }
	blink = rng.randf() * 4.0
	t = rng.randf() * 10.0
	phase = rng.randf() * TAU


func set_variant(part: String, v: String) -> void:
	if not V.has(part) or not V[part].has(v) or act_v.get(part, "") == v: return
	for k in V[part]: (V[part][k] as Node3D).visible = k == v
	act_v[part] = v


# ------------------------------------------------------------- directions --
func place(p: Vector3, y: float) -> void:
	mount = null
	rotation = Vector3.ZERO
	position = p
	yaw = y
	prev_pos = p
	prev_yaw = y
	path = []
	face_yaw = null
	rotation.y = y
	speed = 0.0


## Walk to a point or along points; `await a.go(...)` until there.
func go(pts, sp := 0.0) -> void:
	path = []
	for p in (pts if pts is Array else [pts]): path.append(p if p is Dictionary else { "p": p, "door": "" })
	if sp > 0.0: walk_speed = sp
	if path.is_empty(): return
	pose = "stand"
	await arrived


func go_free(pts, sp := 0.0) -> void:
	path = []
	for p in (pts if pts is Array else [pts]): path.append(p if p is Dictionary else { "p": p, "door": "" })
	if sp > 0.0: walk_speed = sp
	pose = "stand"


func turn_to(at) -> void:
	var p: Vector3 = at.global_position if at is Node3D else at
	var d := p - global_position
	face_yaw = atan2(d.x, d.z)


func do(g: String, d := 1.4) -> void:
	gest = g
	gest_t = 0.0
	gest_d = d


func feel(e: String, m := "", hold := 0.0) -> void:
	if e != "": eyes = e
	if m != "": mouth = m
	eyes_hold = hold


func sit(h: float, kind := "sit") -> void:
	pose = kind
	pose_k = { "h": h }


func stand() -> void:
	pose = "stand"


## Get on something that moves, at a place on it.
func ride(n: Node3D, at_: Vector3) -> void:
	mount = n
	mount_at = at_
	path = []
	face_yaw = null


## Off again, on one's feet, facing as one was.
func alight() -> void:
	mount = null
	var y := yaw
	rotation = Vector3(0, y, 0)
	pose = "stand"


func hold(side: String, n: Node3D, xf := Transform3D()) -> void:
	drop(side)
	held[side] = n
	if n == null: return
	if n.get_parent(): n.get_parent().remove_child(n)
	(P["hand" + side] as Node3D).add_child(n)
	n.transform = xf
	n.visible = true
	hand[side] = "hold"


func drop(side: String) -> Node3D:
	var n: Node3D = held[side]
	held[side] = null
	hand[side] = ""
	if n:
		n.get_parent().remove_child(n)
	return n


func say_bubble(text: String, font: Font, secs := 0.0) -> void:
	if bubble: bubble.queue_free()
	bubble = Label3D.new()
	bubble.text = text
	bubble.font = font
	bubble.font_size = 44
	bubble.pixel_size = 0.0030
	bubble.outline_size = 14
	bubble.modulate = Color("fff6e6")
	bubble.outline_modulate = Color(0.12, 0.14, 0.18, 1)
	bubble.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	bubble.width = 760.0
	bubble.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	bubble.vertical_alignment = VERTICAL_ALIGNMENT_BOTTOM
	bubble.position = Vector3(0, top + 0.16 - ((rest_y - _hips_y()) if pose != "stand" else 0.0), 0)
	bubble.no_depth_test = true
	bubble.render_priority = 10
	add_child(bubble)
	bubble_t = secs if secs > 0.0 else 2.4 + text.length() * 0.045
	talking = minf(bubble_t - 0.6, text.length() * 0.06)


func head_pos() -> Vector3:
	return (P.head as Node3D).global_position + Vector3(0, 0.16, 0)


func hand_pos(side: String) -> Vector3:
	return (P["hand" + side] as Node3D).global_transform * Vector3(0, -1.6 * vs, 0)


# ------------------------------------------------------------------ frame --
func update(dt: float) -> void:
	t += dt
	_move(dt)
	var mv := speed > 0.08
	cm = {}
	for k in J: cm[k] = Vector3.ZERO
	var hips := Vector3(0, rest_y, 0)
	var hips_r := Vector3.ZERO
	var ik := { "L": null, "R": null }
	var shape := { "L": "relax", "R": "relax" }
	if mv and pose == "stand": hips = _gait(dt)
	else:
		var r := _stance(ik, shape)
		hips = r[0]
		hips_r = r[1]
	if gest != "": _gesture(dt, ik, shape)
	# speaking: the head nods along and a hand beats time
	if talking > 0.0:
		talking -= dt
		cm.head += Vector3(sin(t * 5.1) * 0.05, sin(t * 2.3) * 0.06, sin(t * 3.1) * 0.03)
		if gest == "" and not mv and held.R == null and pose in ["stand"]:
			var b := maxf(0.0, sin(t * 2.6))
			cm.uArmR += Vector3(-0.35 * b, 0, -0.06)
			cm.fArmR += Vector3(-0.75 * b, 0, 0)
	if shiver > 0.0:
		cm.torso += Vector3(0, 0, sin(t * 40.0) * 0.02 * shiver)
		cm.head += Vector3(0, sin(t * 43.0) * 0.03 * shiver, 0)
	_look(dt, mv)
	(F.hips as Node3D).position = (F.hips as Node3D).position.lerp(hips, 1.0 - exp(-16.0 * dt))
	_spring("hips", Quaternion.from_euler(hips_r), dt, 14.0, 0.9)
	for k in J:
		if not P.has(k): continue
		if k.begins_with("uArm") or k.begins_with("fArm"): continue
		_spring(k, Quaternion(Basis.from_euler(cm[k], EULER_ORDER_XYZ)), dt, 15.0 if k != "head" else 13.0, 0.78)
	for s in ["L", "R"]: _arm(s, ik[s], dt)
	# hands
	for s in ["L", "R"]:
		var sh: String = hand[s] if hand[s] != "" else shape[s]
		set_variant("hand" + s, sh)
	_face(dt)
	if lod == 0: _second(dt)
	if bubble:
		bubble_t -= dt
		bubble.modulate.a = clampf(bubble_t / 0.4, 0.0, 1.0)
		bubble.outline_modulate.a = bubble.modulate.a
		if bubble_t <= 0.0:
			bubble.queue_free()
			bubble = null


func _spring(k: String, target: Quaternion, dt: float, om: float, z: float) -> void:
	var n: Node3D = P.get(k)
	if n == null: return
	if lod > 0:
		q[k] = (q[k] as Quaternion).slerp(target, 1.0 - exp(-12.0 * dt))
		n.quaternion = q[k]
		return
	var cur: Quaternion = q[k]
	var d := target * cur.inverse()
	if d.w < 0.0: d = -d
	var ang := 2.0 * acos(clampf(d.w, -1.0, 1.0))
	var e := Vector3.ZERO
	if ang > 0.0005: e = Vector3(d.x, d.y, d.z).normalized() * ang
	var v: Vector3 = w[k]
	v += (e * om * om - v * 2.0 * z * om) * dt
	if v.length() > 40.0: v = v.normalized() * 40.0
	var l := v.length() * dt
	if l > 0.00001: cur = (Quaternion(v.normalized(), l) * cur).normalized()
	q[k] = cur
	w[k] = v
	n.quaternion = cur


## An arm: its pose's angles, or a point to reach for (by IK), eased between.
func _arm(s: String, ikp, dt: float) -> void:
	var U := Quaternion(Basis.from_euler(cm["uArm" + s], EULER_ORDER_XYZ))
	var Fq := Quaternion(Basis.from_euler(cm["fArm" + s], EULER_ORDER_XYZ))
	var tgt = reach[s]
	reach_w[s] = move_toward(reach_w[s], 1.0 if tgt != null else 0.0, dt * 3.2)
	var pt = ikp
	if tgt != null or reach_w[s] > 0.0:
		if tgt != null:
			var wp: Vector3 = tgt.global_position if tgt is Node3D else tgt
			set_meta("rp" + s, (P.torso as Node3D).global_transform.affine_inverse() * wp)
		if has_meta("rp" + s):
			var r := _ik(s, get_meta("rp" + s), Vector3(0.7 if s == "L" else -0.7, -0.7, -0.4))
			var k := smoothstep(0.0, 1.0, reach_w[s])
			if pt != null:
				var b := _ik(s, pt[0], pt[1])
				U = (b[0] as Quaternion).slerp(r[0], k)
				Fq = (b[1] as Quaternion).slerp(r[1], k)
			else:
				U = U.slerp(r[0], k)
				Fq = Fq.slerp(r[1], k)
			pt = null
	if pt != null:
		var b := _ik(s, pt[0], pt[1])
		U = b[0]
		Fq = b[1]
	_spring("uArm" + s, U, dt, 14.0, 0.75)
	_spring("fArm" + s, Fq, dt, 16.0, 0.72)


## Two-bone IK: the arm's two rotations so the fist comes to `tgt` (in the torso's space), the elbow out toward `pole`.
func _ik(s: String, tgt: Vector3, pole: Vector3) -> Array:
	var a := ua
	var b := fa
	var d: Vector3 = tgt - (F["uArm" + s] as Node3D).position
	var l := clampf(d.length(), absf(a - b) + 0.01, a + b - 0.004)
	var bend := PI - acos(clampf((a * a + b * b - l * l) / (2.0 * a * b), -1.0, 1.0))
	var u1 := Vector3(0, -a - b * cos(bend), b * sin(bend)).normalized()
	var e := Vector3(0, -a, 0)
	var p1 := (e - u1 * e.dot(u1))
	p1 = p1.normalized() if p1.length() > 0.0001 else Vector3(0, 0, -1)
	var u2 := d.normalized()
	var p2 := (pole - u2 * pole.dot(u2))
	p2 = p2.normalized() if p2.length() > 0.0001 else Vector3(0, 0, -1)
	var B := Basis(u2, p2, u2.cross(p2)) * Basis(u1, p1, u1.cross(p1)).transposed()
	return [B.get_rotation_quaternion(), Quaternion(Vector3.RIGHT, -bend)]


## A point before the chest, in shoulder-widths (x), and arm's lengths below the shoulders (y) and forward (z).
func at(x: float, y: float, z: float) -> Vector3:
	var sh: Vector3 = (F.uArmL as Node3D).position
	var l := ua + fa
	return Vector3(sh.x * x, sh.y + l * y, sh.z + l * z)


# ---------------------------------------------------------------- walking --
func _move(dt: float) -> void:
	if mount != null and is_instance_valid(mount):
		global_transform = mount.global_transform * Transform3D(Basis(), mount_at)
		yaw = atan2(global_transform.basis.z.x, global_transform.basis.z.z)
		speed = 0.0
		vel = (position - prev_pos) / maxf(dt, 0.001)
		prev_pos = position
		return
	var want := 0.0
	if not path.is_empty():
		var tg: Vector3 = path[0].p
		if path[0].get("warp", false):
			position = tg
			path.pop_front()
			if path.is_empty():
				speed = 0.0
				arrived.emit()
			return
		var d := Vector2(tg.x - position.x, tg.z - position.z)
		var l := d.length()
		var dr: String = path[0].get("door", "")
		if dr != "" and stage and stage.doors.has(dr):
			var door: Dictionary = stage.doors[dr]
			if l < 2.6:
				door.hold = maxf(door.hold, 1.1)
				if door.open < 0.6: l = 0.0 if door.pos.distance_to(position) < 1.0 else l
		if l < (0.34 if dr == "" else 0.24) and l > 0.0 and path.size() > 1: l = 0.1                # (a corner needn't be trodden exactly)
		if l < 0.14 and Vector2(tg.x - position.x, tg.z - position.z).length() < (0.35 if path.size() > 1 else 0.14):
			path.pop_front()
			prog = Vector2(INF, 0.0)
			if path.is_empty():
				speed = move_toward(speed, 0.0, 99.0)
				arrived.emit()
		elif l > 0.0:
			yaw = lerp_angle(yaw, atan2(d.x, d.y), 1.0 - exp(-9.0 * dt))
			want = walk_speed
			if path.size() == 1: want = minf(want, maxf(0.35, l * 3.0))
			var dir := Vector2(sin(yaw), cos(yaw)).lerp(d.normalized(), 0.6).normalized()
			# someone in the way: pass them on the right; wait if there's no room yet
			var swerve := 0.0
			var slow := 1.0
			var fw := d.normalized()
			for o in others:
				if o == self or not is_instance_valid(o) or not o.visible or absf(o.position.y - position.y) > 1.2: continue
				var to := Vector2(o.position.x - position.x, o.position.z - position.z)
				var ol := to.length()
				if ol > 1.5 or ol < 0.001: continue
				if d.length() < ol - 0.35: continue                     # (our place is this side of them)
				var ahead := to.dot(fw)
				var off := to.x * fw.y - to.y * fw.x                       # + to our left
				var at_rest: bool = o.speed < 0.1 and not (o.pose in ["stand", "crossed", "hips", "read", "lean", "listen", "behind", "crouch"])
				if ahead < 0.0 or absf(off) > (0.34 if at_rest else 0.62): continue
				var k := clampf(1.0 - (ol - 0.5) / 1.0, 0.0, 1.0)
				swerve += (-1.0 if off >= -0.04 else 1.0) * k * 1.15
				var meets: bool = o.speed > 0.1 and Vector2(sin(o.yaw), cos(o.yaw)).dot(fw) < 0.2
				if ol < 0.55 and not meets and not at_rest: slow = minf(slow, 0.65)
			narrow = dr != "" and l < 1.5 or path.size() > 1 and String(path[1].get("door", "")) != "" and l < 0.9
			if narrow: swerve *= 0.25                                          # (through a door one goes straight)
			if prog.y > 1.6: swerve = 0.0                                      # (enough politeness)
			if swerve != 0.0:
				dir = dir.rotated(clampf(swerve, -1.25, 1.25))
				yaw = lerp_angle(yaw, atan2(dir.x, dir.y), 1.0 - exp(-7.0 * dt))
			prog.y += dt
			var dn := d.length()
			if dn < prog.x - 0.04: prog = Vector2(dn, 0.0)
			elif prog.y > 3.2 and dn < (1.2 if path.size() > 1 else 0.8):                # (jammed: on to the next point)
				path.pop_front()
				prog = Vector2(INF, 0.0)
				if path.is_empty(): arrived.emit()
				return
			want *= slow
			speed = move_toward(speed, want, dt * 6.0)
			var step := minf(speed * dt, Vector2(tg.x - position.x, tg.z - position.z).length())
			var mv := dir * step
			if jam < 7.0:                                                      # (solid: never a step nearer anyone than this)
				for o in others:
					if o == self or not is_instance_valid(o) or not o.visible or absf(o.position.y - position.y) > 1.0: continue
					var r := 0.36 if o.speed < 0.1 and not (o.pose in UPRIGHT) else 0.5
					var to := Vector2(o.position.x - position.x, o.position.z - position.z)
					var ol := to.length()
					if ol > r + 0.3 or ol < 0.001: continue
					if (to - mv).length() < r and (to - mv).length() < ol:
						var nt := to / ol
						var c := mv.dot(nt)
						if c > 0.0: mv -= nt * c
			position.x += mv.x
			position.z += mv.y
			jam = jam + dt if mv.length() < step * 0.25 and step > 0.004 else maxf(0.0, jam - dt * 3.0)
			if jam > 8.5: jam = 0.0
			var full := Vector2(d.x, d.y).length()
			if stage and not stage.floors.is_empty():
				var gy: float = stage.ground_y(position)
				if not is_nan(gy): position.y = lerpf(position.y, gy, 1.0 - exp(-14.0 * dt))
			elif full > 0.01: position.y = lerpf(position.y, tg.y, clampf(step / full, 0.0, 1.0))
			phase += mv.length() / (0.36 + 0.42 * (rest_y / 0.9) * (1.0 + run_k * 0.6)) * PI
		else: speed = move_toward(speed, 0.0, dt * 9.0)
	else:
		if not has_meta("driven"): speed = move_toward(speed, 0.0, dt * 8.0)
		if face_yaw != null:
			yaw = lerp_angle(yaw, face_yaw, 1.0 - exp(-6.0 * dt))
	run_k = move_toward(run_k, 1.0 if speed > 2.3 else 0.0, dt * 4.0)
	rotation.y = yaw
	vel = (position - prev_pos) / maxf(dt, 0.001)
	prev_pos = position


## A stride: legs, arms, a roll of the hips, the feet flexing.
func _gait(_dt: float) -> Vector3:
	var k := clampf(speed / 1.3, 0.35, 1.15) * (1.0 + run_k * 0.35)
	var ph := phase
	var s := sin(ph)
	var c := cos(ph)
	var long: bool = P.has("skirt") and not P.has("skirtF")
	var lk := k * (0.6 if long else 1.0)
	cm.thighL = Vector3(-s * 0.52 * lk - 0.12 * run_k, 0, 0.02)
	cm.thighR = Vector3(s * 0.52 * lk - 0.12 * run_k, 0, -0.02)
	cm.shinL = Vector3(maxf(0.04, c) * (0.75 + 0.75 * run_k) * lk + 0.08, 0, 0)
	cm.shinR = Vector3(maxf(0.04, -c) * (0.75 + 0.75 * run_k) * lk + 0.08, 0, 0)
	cm.footL = Vector3(-0.18 * maxf(0.0, s) * k + 0.35 * maxf(0.0, -s) * maxf(0.0, c) * k, 0, 0)
	cm.footR = Vector3(-0.18 * maxf(0.0, -s) * k + 0.35 * maxf(0.0, s) * maxf(0.0, -c) * k, 0, 0)
	cm.uArmL = Vector3(s * 0.48 * k, 0, 0.09 + run_k * 0.1)
	cm.uArmR = Vector3(-s * 0.48 * k, 0, -0.09 - run_k * 0.1)
	cm.fArmL = Vector3(-0.22 - 0.1 * maxf(0.0, -s) - 1.15 * run_k, 0, 0)
	cm.fArmR = Vector3(-0.22 - 0.1 * maxf(0.0, s) - 1.15 * run_k, 0, 0)
	cm.torso = Vector3(0.04 + 0.2 * run_k, s * 0.1 * k, c * 0.025 * k)
	cm.head = Vector3(-0.02 - 0.14 * run_k, -s * 0.07 * k, 0)
	if pose_k.get("carry", "") == "tray": pass
	for sd in ["L", "R"]:
		if held[sd] != null and not pose_k.get("free", false):
			cm["uArm" + sd] *= 0.35
			cm["fArm" + sd].x = -0.5
	return Vector3(0, rest_y + (absf(c) * (0.03 + 0.05 * run_k) - 0.03) * rest_y - 0.01, 0)


# ------------------------------------------------------------------ poses --
func _stance(ik: Dictionary, shape: Dictionary) -> Array:
	var hips := Vector3(0, rest_y, 0)
	var hr := Vector3.ZERO
	var br := sin(t * 1.7)
	var sw := sin(t * 0.55)
	cm.torso = Vector3(br * 0.016, 0, 0)
	cm.uArmL = Vector3(br * 0.02, 0, 0.07 + br * 0.012)
	cm.uArmR = Vector3(br * 0.02, 0, -0.07 - br * 0.012)
	cm.fArmL = Vector3(-0.14, 0, 0)
	cm.fArmR = Vector3(-0.14, 0, 0)
	if pose in ["stand", "crossed", "hips", "behind", "read", "cast", "shy", "letter", "proud", "carry", "hug", "lean", "listen"]:
		# the weight on one leg, then the other
		hips.x += sw * 0.014
		hr.z = sw * 0.025
		cm.thighL = Vector3(0.01, 0, 0.03 - sw * 0.03)
		cm.thighR = Vector3(0.01, 0, -0.03 - sw * 0.03)
		cm.shinL = Vector3(0.04 + maxf(0.0, -sw) * 0.08, 0, 0)
		cm.shinR = Vector3(0.04 + maxf(0.0, sw) * 0.08, 0, 0)
		cm.torso += Vector3(0, 0, -sw * 0.03)
	match pose:
		"crossed":
			ik.L = [at(-0.55, -0.42, 0.34), Vector3(0.9, -0.6, 0.1)]
			ik.R = [at(0.55, -0.5, 0.38), Vector3(-0.9, -0.6, 0.1)]
			cm.torso += Vector3(-0.04, 0, 0)
		"hips":
			ik.L = [at(1.15, -0.86, 0.08), Vector3(1, -0.1, -0.6)]
			ik.R = [at(-1.15, -0.86, 0.08), Vector3(-1, -0.1, -0.6)]
			shape.L = "fist"
			shape.R = "fist"
		"behind":
			ik.L = [at(0.2, -0.9, -0.42), Vector3(0.8, 0, -0.6)]
			ik.R = [at(-0.2, -0.9, -0.42), Vector3(-0.8, 0, -0.6)]
		"shy":
			ik.L = [at(0.1, -0.78, 0.36), Vector3(0.9, -0.4, 0)]
			ik.R = [at(-0.1, -0.8, 0.36), Vector3(-0.9, -0.4, 0)]
			cm.head += Vector3(0.14, 0, 0)
			cm.torso += Vector3(0.06, 0, 0)
		"proud":
			cm.torso += Vector3(-0.09, 0, 0)
			cm.head += Vector3(-0.06, 0, 0)
			ik.L = [at(1.1, -0.86, 0.06), Vector3(1, -0.1, -0.6)]
			shape.L = "fist"
		"read":
			ik.L = [at(0.45, -0.46, 0.52), Vector3(0.7, -0.9, 0)]
			ik.R = [at(-0.45, -0.46, 0.52), Vector3(-0.7, -0.9, 0)]
			shape.L = "hold"
			shape.R = "hold"
			cm.head += Vector3(0.3, sin(t * 0.8) * 0.06, 0)
		"letter":
			ik.L = [at(0.5, -0.3, 0.6), Vector3(0.7, -0.9, 0)]
			ik.R = [at(-0.5, -0.3, 0.6), Vector3(-0.7, -0.9, 0)]
			shape.L = "hold"
			shape.R = "hold"
			cm.head += Vector3(0.16, 0, 0)
		"cast":                                          # a hand out, palm open, the feet apart
			ik.R = [at(-0.5, 0.02 + sin(t * 2.2) * 0.02, 0.92), Vector3(-0.8, -0.8, 0)]
			shape.R = "open"
			cm.handR = Vector3(1.2, 0, 0)
			ik.L = [at(1.1, -0.55, 0.2), Vector3(1, -0.4, -0.5)]
			cm.torso += Vector3(0.05, 0.16, 0)
			cm.thighL = Vector3(-0.2, 0, 0.1)
			cm.thighR = Vector3(0.2, 0, -0.1)
			cm.shinL = Vector3(0.22, 0, 0)
			hips.y -= 0.02
		"carry":
			ik.L = [at(0.5, -0.62, 0.5), Vector3(0.8, -0.8, -0.2)]
			ik.R = [at(-0.5, -0.62, 0.5), Vector3(-0.8, -0.8, -0.2)]
			shape.L = "hold"
			shape.R = "hold"
		"hug":
			ik.L = [at(0.1, -0.25, 0.62), Vector3(0.9, -0.4, 0.2)]
			ik.R = [at(-0.1, -0.35, 0.6), Vector3(-0.9, -0.4, 0.2)]
			cm.torso += Vector3(0.14, 0, 0)
			cm.head += Vector3(0.12, 0.25, 0.1)
		"sit", "desk", "sitread", "sitedge", "eat", "sleepdesk", "drive":
			var h: float = pose_k.get("h", 0.46)
			hips.y = h + float(spec.info.get("seat", 2.4)) * vs - 0.01
			cm.thighL = Vector3(-1.5, 0, 0.07)
			cm.thighR = Vector3(-1.5, 0, -0.07)
			var over := maxf(0.0, hips.y - float(spec.info.get("shin", 0.45)) - 0.03)      # (a child's feet don't reach the ground: they swing)
			cm.shinL = Vector3(1.45 - (sin(t * 2.4) * 0.35 if over > 0.04 else 0.0), 0, 0)
			cm.shinR = Vector3(1.45 + (sin(t * 2.4) * 0.35 if over > 0.04 else 0.0), 0, 0)
			cm.torso += Vector3(0.03, 0, 0)
			if pose == "sit":
				ik.L = [at(0.5, -0.86, 0.36), Vector3(0.9, -0.2, -0.3)]
				ik.R = [at(-0.5, -0.86, 0.36), Vector3(-0.9, -0.2, -0.3)]
			elif pose == "desk":
				ik.L = [at(0.55, -0.6, 0.62), Vector3(0.9, -0.5, 0)]
				ik.R = [at(-0.35, -0.6 + absf(sin(t * 3.0)) * 0.01, 0.62 + sin(t * 1.9) * 0.02), Vector3(-0.9, -0.5, 0)]
				shape.R = "hold"
				cm.torso += Vector3(0.12, 0, 0)
			elif pose == "sitread":
				ik.L = [at(0.5, -0.56, 0.5), Vector3(0.8, -0.8, 0)]
				ik.R = [at(-0.5, -0.56, 0.5), Vector3(-0.8, -0.8, 0)]
				shape.L = "hold"
				shape.R = "hold"
				cm.head += Vector3(0.32, 0, 0)
			elif pose == "sitedge":
				ik.L = [at(1.2, -0.95, 0.05), Vector3(0.9, 0, -0.6)]
				ik.R = [at(-1.2, -0.95, 0.05), Vector3(-0.9, 0, -0.6)]
				cm.torso += Vector3(-0.05, 0, 0)
			elif pose == "eat":
				var b := smoothstep(0.0, 1.0, clampf(sin(t * 1.4) * 1.6, 0.0, 1.0))
				ik.L = [at(0.6, -0.62, 0.5), Vector3(0.9, -0.4, 0)]
				ik.R = [at(-0.35, -0.6, 0.55).lerp(at(-0.1, 0.16, 0.52), b), Vector3(-0.9, -0.5, 0)]
				shape.R = "hold"
				cm.head += Vector3(0.1 + b * 0.12, 0, 0)
			elif pose == "sleepdesk":
				cm.torso += Vector3(0.75, 0, 0)
				cm.head += Vector3(0.35, 0.5, 0)
				ik.L = [at(0.1, -0.2, 0.75), Vector3(0.9, 0, 0)]
				ik.R = [at(-0.1, -0.2, 0.75), Vector3(-0.9, 0, 0)]
			elif pose == "drive":                         # the reins
				ik.L = [at(0.35, -0.55, 0.62), Vector3(0.8, -0.7, 0)]
				ik.R = [at(-0.35, -0.55 + sin(t * 4.0) * 0.015, 0.62), Vector3(-0.8, -0.7, 0)]
				shape.L = "fist"
				shape.R = "fist"
		"swing":                                         # on a plank between ropes, a hand to each: legs out and leaning back as it goes forward, tucked as it goes back
			var pend: Dictionary = pose_k.get("sw", {})
			var v: float = clampf(float(pend.get("om", 0.0)) / maxf(0.05, float(pend.get("amp", 0.2)) * 1.77), -1.0, 1.0)
			hips.y = float(spec.info.get("seat", 2.4)) * vs - 0.005
			cm.thighL = Vector3(-1.5 - 0.06 * v, 0, 0.05)
			cm.thighR = Vector3(-1.5 - 0.06 * v, 0, -0.05)
			cm.shinL = Vector3(1.15 - 0.62 * v, 0, 0)
			cm.shinR = Vector3(1.15 - 0.62 * v, 0, 0)
			cm.footL = Vector3(0.25 + 0.15 * v, 0, 0)
			cm.footR = Vector3(0.25 + 0.15 * v, 0, 0)
			cm.torso = Vector3(0.03 - 0.17 * v, 0, 0)
			cm.head = Vector3(0.10 * v, 0, 0)
			shape.L = "hold"
			shape.R = "hold"
		"ground", "groundread":                          # sat on the grass, the knees up
			hips.y = float(spec.info.get("seat", 2.4)) * vs
			cm.thighL = Vector3(-2.15, 0, 0.1)
			cm.thighR = Vector3(-2.0, 0, -0.1)
			cm.shinL = Vector3(2.15, 0, 0)
			cm.shinR = Vector3(1.95, 0, 0)
			cm.torso += Vector3(0.1, 0, 0)
			if pose == "groundread":
				ik.L = [at(0.5, -0.5, 0.5), Vector3(0.8, -0.8, 0)]
				ik.R = [at(-0.5, -0.5, 0.5), Vector3(-0.8, -0.8, 0)]
				shape.L = "hold"
				shape.R = "hold"
				cm.head += Vector3(0.32, 0, 0)
			else:
				ik.L = [at(0.6, -0.5, 0.6), Vector3(0.9, 0, 0)]
				ik.R = [at(-0.4, -0.52, 0.6), Vector3(-0.9, 0, 0)]
		"kneel":
			hips.y = rest_y * 0.52
			cm.thighL = Vector3(-1.45, 0, 0.06)
			cm.shinL = Vector3(1.5, 0, 0)
			cm.thighR = Vector3(0.12, 0, -0.06)
			cm.shinR = Vector3(1.6, 0, 0)
			cm.footR = Vector3(0.9, 0, 0)
			cm.torso += Vector3(0.12, 0, 0)
		"crouch":
			hips.y = rest_y * 0.55
			cm.thighL = Vector3(-1.5, 0, 0.16)
			cm.thighR = Vector3(-1.5, 0, -0.16)
			cm.shinL = Vector3(2.0, 0, 0)
			cm.shinR = Vector3(2.0, 0, 0)
			cm.footL = Vector3(-0.5, 0, 0)
			cm.footR = Vector3(-0.5, 0, 0)
			cm.torso += Vector3(0.35, 0, 0)
			cm.head += Vector3(-0.2, 0, 0)
		"lie":
			pass
		"lean":
			cm.torso += Vector3(0.0, 0, 0.1)
			hr.z += 0.08
			ik.L = [at(-0.5, -0.45, 0.34), Vector3(0.9, -0.6, 0.1)]
			ik.R = [at(0.5, -0.52, 0.36), Vector3(-0.9, -0.6, 0.1)]
			cm.thighR += Vector3(-0.25, 0, 0)
			cm.shinR += Vector3(0.4, 0, 0)
		"listen":
			ik.R = [at(-0.25, 0.1, 0.36), Vector3(-0.8, -0.8, 0)]
			ik.L = [at(-0.3, -0.48, 0.36), Vector3(0.9, -0.5, 0)]
			cm.head += Vector3(0.04, 0.08, 0.1)
	for sd in ["L", "R"]:
		if held[sd] != null and ik[sd] == null and pose == "stand": cm["fArm" + sd].x = -0.75
	return [hips, hr]


# --------------------------------------------------------------- gestures --
func _env(a := 0.22, b := 0.28) -> float:
	var u := gest_t / gest_d
	return smoothstep(0.0, a, u) * (1.0 - smoothstep(1.0 - b, 1.0, u))


func _gesture(dt: float, ik: Dictionary, shape: Dictionary) -> void:
	gest_t += dt
	var e := _env()
	var u := clampf(gest_t / gest_d, 0.0, 1.0)
	var g := gest
	if gest_t >= gest_d:
		gest = ""
		body.position = Vector3.ZERO
		body.rotation = Vector3.ZERO
		return
	match g:
		"nod": cm.head += Vector3(sin(u * TAU * 2.0) * 0.22 * e, 0, 0)
		"shake": cm.head += Vector3(0, sin(u * TAU * 2.5) * 0.35 * e, 0)
		"tilt": cm.head += Vector3(0, 0.1 * e, 0.28 * e)
		"sigh":
			cm.torso += Vector3(sin(u * PI) * 0.16, 0, 0)
			cm.head += Vector3(sin(u * PI) * 0.35, 0, 0)
		"gulp": cm.head += Vector3(-0.12 * sin(u * TAU) * e, 0, 0)
		"wave":
			ik.R = [at(-1.5, 0.75, 0.2) + Vector3(sin(u * TAU * 3.0) * 0.1, 0, 0), Vector3(-1, -0.3, 0.2)]
			shape.R = "open"
			cm.torso += Vector3(0, 0, 0.06 * e)
		"wavebig":
			ik.R = [at(-1.2, 0.95, 0.1) + Vector3(sin(u * TAU * 4.0) * 0.2, 0, 0), Vector3(-1, 0, 0)]
			shape.R = "open"
			body.position.y = absf(sin(u * TAU * 3.0)) * 0.1
		"point":
			ik.R = [at(-0.5, 0.0, 0.98), Vector3(-0.8, -0.8, 0)]
			shape.R = "point"
			cm.torso += Vector3(0.05, 0.15, 0) * e
		"pointup":
			ik.R = [at(-0.7, 0.35, 0.45), Vector3(-0.8, -0.8, 0)]
			shape.R = "point"
		"shrug":
			ik.L = [at(1.5, -0.45, 0.4), Vector3(0.7, -1, -0.3)]
			ik.R = [at(-1.5, -0.45, 0.4), Vector3(-0.7, -1, -0.3)]
			shape.L = "open"
			shape.R = "open"
			cm.head += Vector3(0, 0, 0.16 * e)
		"bow":
			cm.torso += Vector3(0.75 * sin(u * PI), 0, 0)
			cm.head += Vector3(0.25 * sin(u * PI), 0, 0)
		"curtsy":
			(cm.torso as Vector3)
			cm.torso += Vector3(0.3 * sin(u * PI), 0, 0)
			cm.head += Vector3(0.2 * sin(u * PI), 0, 0)
			body.position.y = -0.06 * sin(u * PI)
		"scratch":
			ik.R = [at(-1.15, 0.5 + sin(u * 40.0) * 0.02, -0.02), Vector3(-1, 0.1, 0.1)]
			cm.head += Vector3(0.1, 0.1, -0.12) * e
			shape.R = "hold"
		"facepalm":
			ik.R = [at(-0.15, 0.36, 0.52), Vector3(-0.9, -0.5, 0.2)]
			shape.R = "open"
			cm.head += Vector3(0.3 * e, 0, 0)
		"cheer":
			ik.L = [at(1.0, 0.95, 0.15), Vector3(1, 0, 0)]
			ik.R = [at(-1.0, 0.95, 0.15), Vector3(-1, 0, 0)]
			shape.L = "fist"
			shape.R = "fist"
			body.position.y = absf(sin(u * TAU * 1.5)) * 0.2 * (1.0 - u * 0.5)
		"hop": body.position.y = sin(minf(1.0, u * 1.3) * PI) * 0.18
		"leap":                                          # in the air, arms flung up, the knees a little bent
			ik.L = [at(1.4, 0.5, 0.3), Vector3(1, 0, 0)]
			ik.R = [at(-1.4, 0.5, 0.3), Vector3(-1, 0, 0)]
			shape.L = "open"
			shape.R = "open"
			cm.thighL += Vector3(-0.45, 0, 0.04) * e
			cm.thighR += Vector3(-0.3, 0, -0.04) * e
			cm.shinL += Vector3(0.6, 0, 0) * e
			cm.shinR += Vector3(0.5, 0, 0) * e
			cm.torso += Vector3(0.12, 0, 0) * e
		"jump":
			body.position.y = sin(clampf((u - 0.15) / 0.75, 0.0, 1.0) * PI) * 0.32
			ik.L = [at(1.3, 0.6, 0.2), Vector3(1, 0, 0)]
			ik.R = [at(-1.3, 0.6, 0.2), Vector3(-1, 0, 0)]
		"flinch":
			var k := exp(-u * 4.0)
			cm.torso += Vector3(-0.35 * k, 0, 0)
			cm.head += Vector3(-0.2 * k, 0.3 * k, 0)
			ik.L = [at(0.5, 0.2, 0.5).lerp(at(0.8, -0.8, 0.2), u), Vector3(1, -0.3, 0)]
			ik.R = [at(-0.5, 0.15, 0.5).lerp(at(-0.8, -0.8, 0.2), u), Vector3(-1, -0.3, 0)]
			shape.L = "open"
			shape.R = "open"
		"laugh":
			cm.torso += Vector3(0.12 + sin(t * 17.0) * 0.05, 0, 0) * e
			cm.head += Vector3(-0.15 + sin(t * 17.0) * 0.06, 0, 0) * e
			ik.L = [at(0.2, -0.6, 0.32), Vector3(0.9, -0.4, 0)]
		"giggle":
			cm.torso += Vector3(0.08 + sin(t * 19.0) * 0.03, 0, 0) * e
			ik.R = [at(-0.15, 0.1, 0.5), Vector3(-0.9, -0.6, 0)]
			cm.head += Vector3(0.1, 0.12, 0.08) * e
		"clap":
			var c := absf(sin(t * 11.0)) * 0.5
			ik.L = [at(c, -0.2, 0.5), Vector3(0.9, -0.5, 0)]
			ik.R = [at(-c, -0.2, 0.5), Vector3(-0.9, -0.5, 0)]
			shape.L = "open"
			shape.R = "open"
		"chest":
			ik.R = [at(0.2, -0.3, 0.32), Vector3(-0.9, -0.6, 0)]
			shape.R = "open"
		"mouthcover":
			ik.L = [at(0.22, 0.12, 0.5), Vector3(0.9, -0.6, 0)]
			ik.R = [at(-0.22, 0.08, 0.5), Vector3(-0.9, -0.6, 0)]
			shape.L = "open"
			shape.R = "open"
		"offer":
			ik.R = [at(-0.35, -0.35, 0.8), Vector3(-0.8, -0.9, 0)]
			shape.R = "hold"
		"offer2":
			ik.R = [at(-0.45, -0.4, 0.75), Vector3(-0.8, -0.9, 0)]
			ik.L = [at(0.45, -0.4, 0.75), Vector3(0.8, -0.9, 0)]
			shape.R = "hold"
			shape.L = "hold"
		"pat":
			ik.R = [at(-0.4, -0.12 + sin(u * TAU * 3.0) * 0.05, 0.78), Vector3(-0.9, -0.4, 0)]
			shape.R = "open"
		"ruffle":
			ik.R = [at(-0.3 + sin(u * TAU * 4.0) * 0.2, -0.05, 0.72), Vector3(-0.9, -0.3, 0)]
			shape.R = "open"
		"snap":
			ik.R = [at(-0.7, -0.2, 0.5), Vector3(-0.8, -0.8, 0)]
			shape.R = "point" if u < 0.45 else "fist"
		"flick":                                         # a small turn of the wrist, half hidden
			ik.R = [at(-0.6, -0.62, 0.46), Vector3(-0.9, -0.6, 0)]
			cm.handR = Vector3(0, sin(u * PI) * 1.6, 0)
			shape.R = "point"
		"toss":
			ik.R = [at(-0.5, -0.5, 0.2).lerp(at(-0.5, 0.35, 0.85), smoothstep(0.25, 0.45, u)), Vector3(-0.8, -0.8, 0)]
			shape.R = "fist" if u < 0.4 else "open"
		"scatter":
			ik.R = [at(-0.4, -0.55, 0.4).lerp(at(-1.6, -0.35, 0.6), smoothstep(0.2, 0.5, u)), Vector3(-0.8, -0.8, 0)]
			shape.R = "fist" if u < 0.35 else "open"
			cm.torso += Vector3(0.18, 0.3 - u * 0.7, 0) * e
		"castdo":                                        # the spell's gesture: drawn in, thrust out
			ik.R = [at(-0.3, -0.25, 0.3).lerp(at(-0.45, 0.06, 0.98), smoothstep(0.35, 0.5, u)), Vector3(-0.8, -0.8, 0)]
			shape.R = "fist" if u < 0.4 else "open"
			cm.handR = Vector3(1.3 * smoothstep(0.35, 0.5, u), 0, 0)
			cm.torso += Vector3(0.1 * smoothstep(0.35, 0.5, u), 0.25 - 0.4 * u, 0) * e
		"castbig":
			ik.R = [at(-0.4, 0.2, 0.4).lerp(at(-0.5, 0.75, 0.6), smoothstep(0.3, 0.5, u)), Vector3(-0.8, -0.4, 0)]
			ik.L = [at(0.4, 0.2, 0.4).lerp(at(0.5, 0.75, 0.6), smoothstep(0.3, 0.5, u)), Vector3(0.8, -0.4, 0)]
			shape.R = "open"
			shape.L = "open"
		"pickup":
			var k := sin(u * PI)
			cm.torso += Vector3(1.0 * k, 0, 0)
			cm.thighL += Vector3(-0.7 * k, 0, 0)
			cm.thighR += Vector3(-0.7 * k, 0, 0)
			cm.shinL += Vector3(0.9 * k, 0, 0)
			cm.shinR += Vector3(0.9 * k, 0, 0)
			body.position.y = -0.14 * k
			ik.R = [at(-0.4, -1.0, 0.5 * k), Vector3(-0.8, 0, -0.4)]
			shape.R = "hold"
		"cough":
			ik.R = [at(-0.15, 0.1, 0.5), Vector3(-0.9, -0.6, 0)]
			shape.R = "fist"
			cm.torso += Vector3(0.22 + sin(t * 14.0) * 0.08, 0, 0) * e
		"stretch":
			ik.L = [at(0.7, 1.0, -0.05), Vector3(1, 0.2, 0)]
			ik.R = [at(-0.7, 1.0, -0.05), Vector3(-1, 0.2, 0)]
			cm.torso += Vector3(-0.2, 0, 0) * e
			cm.head += Vector3(-0.25, 0, 0) * e
		"yawn":
			ik.R = [at(-0.15, 0.14, 0.5), Vector3(-0.9, -0.6, 0)]
			cm.head += Vector3(-0.25, 0, 0) * e
			shape.R = "open"
		"stomp": body.position.y = maxf(0.0, sin(u * TAU * 2.0)) * 0.06
		"spin":
			body.rotation.y = smoothstep(0.1, 0.9, u) * TAU
			body.position.y = sin(u * PI) * 0.08
		"look":
			cm.head += Vector3(0, sin(u * TAU) * 0.8, 0) * e
			cm.torso += Vector3(0, sin(u * TAU) * 0.2, 0) * e
		"dust":
			ik.R = [at(-0.6, -0.5 + sin(t * 14.0) * 0.1, 0.34), Vector3(-0.9, -0.4, 0)]
			shape.R = "open"
		"salute":
			ik.R = [at(-1.05, 0.55, 0.16), Vector3(-1, 0.1, 0.2)]
			shape.R = "open"
		"hug":
			ik.L = [at(0.1, -0.25, 0.62), Vector3(0.9, -0.4, 0.2)]
			ik.R = [at(-0.1, -0.35, 0.6), Vector3(-0.9, -0.4, 0.2)]
			cm.torso += Vector3(0.14, 0, 0) * e
		"fall":                                          # knocked back onto the seat of his trousers
			var k := smoothstep(0.0, 0.25, u) * (1.0 - smoothstep(0.8, 1.0, u))
			body.position.y = -rest_y * 0.72 * k
			cm.thighL = cm.thighL.lerp(Vector3(-1.5, 0, 0.2), k)
			cm.thighR = cm.thighR.lerp(Vector3(-1.4, 0, -0.2), k)
			cm.shinL = cm.shinL.lerp(Vector3(0.4, 0, 0), k)
			cm.shinR = cm.shinR.lerp(Vector3(0.5, 0, 0), k)
			cm.torso += Vector3(-0.35 * k, 0, 0)
			ik.L = [at(1.2, -0.9, -0.3), Vector3(0.9, 0, -0.6)]
			ik.R = [at(-1.2, -0.9, -0.3), Vector3(-0.9, 0, -0.6)]
		"shield":
			ik.L = [at(0.1, 0.3, 0.5), Vector3(0.9, 0, 0)]
			ik.R = [at(-0.1, 0.36, 0.48), Vector3(-0.9, 0, 0)]
			cm.torso += Vector3(0.2 * e, 0, 0)
		"hat":                                           # a hand to a hat that isn't there (an old habit)
			ik.R = [at(-1.02, 0.66, 0.14), Vector3(-1, -0.2, -0.3)]
			shape.R = "hold"
			cm.head += Vector3(0.14, 0, -0.08) * e


# ------------------------------------------------------------ looking about --
func _look(dt: float, mv: bool) -> void:
	var want := Vector2.ZERO
	var on := 0.0
	if look != null and (not (look is Node3D) or is_instance_valid(look)):
		var p: Vector3
		if look is Node3D: p = look.head_pos() if look.has_method("head_pos") else (look as Node3D).global_position
		else: p = look
		var d := p - head_pos()
		var y := wrapf(atan2(d.x, d.z) - global_rotation.y, -PI, PI)
		if absf(y) < 2.0:
			on = 1.0
			want = Vector2(clampf(y, -1.15, 1.15), clampf(-atan2(d.y, Vector2(d.x, d.z).length()), -0.45, 0.2))      # (looking down is mostly the eyes: a head bent far hides its face in its hair)
	look_w = move_toward(look_w, on, dt * 3.0)
	look_yp = look_yp.lerp(want, 1.0 - exp(-7.0 * dt))
	var k := smoothstep(0.0, 1.0, look_w) * (0.8 if mv else 1.0)
	cm.head += Vector3(look_yp.y * k - (cm.head as Vector3).x * 0.5 * k, look_yp.x * 0.75 * k, 0)
	cm.torso += Vector3(0, look_yp.x * 0.25 * k, 0)


func _face(dt: float) -> void:
	if not V.has("eyes"): return
	blink -= dt
	if eyes_hold > 0.0:
		eyes_hold -= dt
		if eyes_hold <= 0.0:
			eyes = "open"
			mouth = "flat"
	var ev := eyes
	if blink < 0.0:
		if blink < -0.12: blink = 1.6 + rng.randf() * 3.6
		elif not (eyes in ["happy", "squeeze", "shut", "down", "wink"]): ev = "shut"
	if not V.eyes.has(ev): ev = "open"
	set_variant("eyes", ev)
	var mv := mouth
	if talking > 0.0:
		flap -= dt
		if flap <= 0.0:
			flap = 0.07 + rng.randf() * 0.07
			set_meta("mv", ["mid", "open", "small", "mid", "oh", "flat"][rng.randi() % 6])
		mv = get_meta("mv", "mid")
	if not V.mouth.has(mv): mv = "flat"
	set_variant("mouth", mv)


# -------------------------------------------------------- what swings along --
func _second(dt: float) -> void:
	var loc := vel.rotated(Vector3.UP, -yaw)
	var dy := wrapf(yaw - prev_yaw, -PI, PI) / maxf(dt, 0.001)
	prev_yaw = yaw
	var tl := (cm.torso as Vector3).x
	for k in swing:
		var s: Dictionary = swing[k]
		var goal := Vector2.ZERO
		var om := 9.0
		match k:
			"cape":
				goal = Vector2(clampf(loc.z * 0.16, -0.1, 0.75) + sin(t * 1.3) * 0.015 + maxf(0.0, -body.position.y) - tl * 0.6, clampf(-dy * 0.06, -0.3, 0.3))
				om = 7.0
			"satchel": goal = Vector2(sin(phase) * 0.12 * clampf(speed, 0.0, 1.2), 0.0)
			_: goal = Vector2(clampf(loc.z * 0.12, -0.2, 0.5) + sin(phase * 2.0) * 0.06 * clampf(speed, 0.0, 1.5) - (cm.head as Vector3).x * 0.4 - tl * 0.4, clampf(loc.x * 0.1 - dy * 0.05, -0.35, 0.35))
		s.v += ((goal - s.a) * om * om - s.v * 2.0 * 0.45 * om) * dt
		s.a += s.v * dt
		(P[k] as Node3D).rotation = Vector3(s.a.x, 0, s.a.y)
	# a skirt's halves follow the thighs
	if P.has("skirtF"):
		var tl2: float = (P.thighL as Node3D).rotation.x
		var tr2: float = (P.thighR as Node3D).rotation.x
		var fwd := clampf(minf(tl2, tr2) * 0.8, -1.4, 0.0)
		var bk := clampf(maxf(tl2, tr2) * 0.8, 0.0, 0.7)
		if pose in ["sit", "desk", "sitread", "sitedge", "eat", "sleepdesk", "ground", "groundread", "swing"]:
			fwd = -1.25
			bk = -0.15
		(P.skirtF as Node3D).rotation.x = lerpf((P.skirtF as Node3D).rotation.x, fwd, 1.0 - exp(-14.0 * dt))
		(P.skirtB as Node3D).rotation.x = lerpf((P.skirtB as Node3D).rotation.x, bk, 1.0 - exp(-14.0 * dt))
	if P.has("skirt") and pose in ["sit", "eat", "desk", "sitread", "sitedge"] and not P.has("skirtF"):
		(P.skirt as Node3D).rotation.x = lerpf((P.skirt as Node3D).rotation.x, -0.5, 1.0 - exp(-8.0 * dt))
	elif P.has("skirt"): (P.skirt as Node3D).rotation.x = lerpf((P.skirt as Node3D).rotation.x, 0.0, 1.0 - exp(-8.0 * dt))


func _hips_y() -> float:
	return (F.hips as Node3D).position.y


## Lie down (in bed): the whole body laid back, at a height.
func lie_at(p: Vector3, y: float) -> void:
	place(p, y)
	pose = "lie"
	body.rotation = Vector3(-PI / 2, 0, 0)
	body.position = Vector3(0, 0.49, rest_y * 0.95)
	eyes = "shut"


func get_up() -> void:
	pose = "stand"
	body.rotation = Vector3.ZERO
	body.position = Vector3.ZERO
	eyes = "open"
