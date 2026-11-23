extends Node3D
## Trap Trick as a playable character: movement, the jointed animation and the secondary motion.
## A port of the web version's js/anim.js. Her rig comes baked from the voxel builder (assets/trap_trick.glb): every part
## is a "frame" node (its fixed place in the parent) holding a "joint" node that the animation turns.
##
## A frame, built like the web version:
##   1. movement: speed eases toward the stick, she turns toward where she's going (leaning into it), jumps and lands.
##   2. the pose (Euler angles per joint): idle breathing and weight shift, a walk/run gait whose phase follows the
##      distance travelled, the air pose, the landing squash.
##   3. every joint eases toward its target; the hips drop so the lower foot stays on the ground.
##   4. springs move the hair, the twelve skirt panels, the bow tails and the dangling cards.
## An arm holding the umbrella goes on IK (shoulder -> elbow -> wrist, then the wrist turns the fist so the umbrella
## points where the pose wants it). Emotes and tricks overlay the pose, fading in and out.

const WALK := 1.45
const RUN := 4.3
const JUMP_V := 4.4
const GRAV := 15.5
const FLOAT_V := -1.05
const UPPER := 9.0                   # shoulder to elbow, voxels
const FORE := 8.0                    # elbow to wrist
const GRIP := 2.0                    # wrist to the middle of the fist
const ACTIONS := {
	"wave": { "dur": 2.2, "lock": false, "fi": 0.25, "fo": 0.3 },
	"point": { "dur": 1.8, "lock": false },
	"curtsy": { "dur": 2.3, "lock": true },
	"spin": { "dur": 1.25, "lock": true, "fi": 0.1, "fo": 0.15 },
	"peace": { "dur": 2.4, "lock": true },
	"hatTip": { "dur": 1.5, "lock": false },
	"lookAround": { "dur": 3.2, "lock": false },
	"hatFix": { "dur": 1.6, "lock": false },
	"heelRock": { "dur": 2.6, "lock": false },
	"lazyTwirl": { "dur": 3.0, "lock": false },
	"umbrellaTwirl": { "dur": 2.6, "lock": true },
	"enGarde": { "dur": 2.2, "lock": true, "fi": 0.12 },
	"cardFan": { "dur": 2.4, "lock": true },
}
const DRIVEN := ["hips", "spine", "chest", "neck", "head", "hat", "uArmL", "fArmL", "handL", "uArmR", "fArmR", "handR", "thighL", "shinL", "footL", "thighR", "shinR", "footR"]

var main: Node3D
var meta: Dictionary
var J: Dictionary
var S := 0.024
var body: Node3D                     # an inner node for whole-body lean and spin
var P := {}                          # joints, by part name
var F := {}                          # their frames
var variants := {}                   # part -> { variant name: node }
var active := {}

# movement
var yaw := 0.0
var t_yaw := 0.0
var yaw_rate := 0.0
var speed := 0.0
var vy := 0.0
var air := 0.0
var on_ground := true
var vel := Vector3.ZERO
var accel := Vector3.ZERO
var phase := 0.0
var run_k := 0.0
var move_k := 0.0
var step_k := 0.0
var t := 0.0
var land_k := 0.0
var hips_cur := 0.0
var tq := {}

# face
var face_base := "smug"
var blink_t := 2.5
var blinking := 0.0

# springs
var dyn: Array = []
var panels: Array = []
var back_flare := 0.0
var panel_lift := 0.0                # the curtsy lifts the side panels

# the umbrella
var fx: Node3D
var umb: Node3D
var umb_grip: Node3D
var umb_canopy: Node3D
var umb_folds: Array = []
var umb_bow: Node3D
var U := { "st": "away", "open": 0.0, "open_t": 0.0, "tilt": 0, "vis": 0.0, "side": "R", "spin": 0.0, "cspin": 0.0, "spin_v": 0.0 }
var hold_w := { "L": 0.0, "R": 0.0 }
var held := { "L": false, "R": false }
var floating := false
var SH := { "L": Vector3(8, 6, 0), "R": Vector3(-8, 6, 0) }   # the shoulders in chest space (voxels)

# actions
var act := {}                        # the running action, {} when none
var act_t := 0.0
var act_face := ""
var idle_t := 0.0

# sitting
var seat = null
var last_seat = null
var sit_from := Vector3.ZERO
var sit_t := 0.0
var sit_k := 0.0
var unseat = null

# the skeleton view
var mats: Array = []
var skel_on := false
var skel_lines: MeshInstance3D
var skel_dots: MultiMeshInstance3D
var skel_pairs: Array = []


func setup(bake: Dictionary, main_node: Node3D) -> void:
	main = main_node
	meta = bake.rig
	J = meta.J
	S = meta.S
	body = Node3D.new()
	add_child(body)
	fx = main.fx
	mats = [main.lit_mat.duplicate(), main.glow_mat.duplicate()]   # her own, so the skeleton view can fade them
	var scene: Node3D = load("res://assets/trap_trick.glb").instantiate()
	body.add_child(scene)
	main.voxelize(scene, mats[0], mats[1])
	var rig: Node3D = scene.find_child("rig", true, false)
	rig.position.y = 0.5 * S
	for n in meta.order:
		P[n] = rig.find_child(n, true, false)
		F[n] = rig.find_child(n + "__frame", true, false)
		var vs: Array = meta.joints[n].variants
		if vs.size() > 0:
			variants[n] = {}
			for v in vs: variants[n][v] = rig.find_child(n + "__v_" + v, true, false)
			set_variant(n, meta.joints[n].default if meta.joints[n].default != null else vs[0])
	for n in DRIVEN: tq[n] = Quaternion.IDENTITY
	SH = { "L": Vector3(J.armX, J.shoulder - J.chest, 0), "R": Vector3(-J.armX, J.shoulder - J.chest, 0) }
	# the umbrella rides a grip in her fist: its +Y (up the shaft) along the fist's thumb side
	var us: Node3D = load("res://assets/umbrella.glb").instantiate()
	main.voxelize(us, mats[0], mats[1])
	umb = us.find_child("umbrella", true, false)
	umb_canopy = us.find_child("canopy", true, false)
	for i in 8: umb_folds.append(us.find_child("fold_%d" % i, true, false))
	umb_bow = us.find_child("bow_top", true, false)
	umb_grip = Node3D.new()
	umb_grip.add_child(us)
	umb_grip.visible = false
	(P.handR as Node3D).add_child(umb_grip)
	umb.scale = Vector3.ONE * 0.001
	_umb_set_open(0.0)
	_init_dynamics()


func set_variant(part: String, v: String) -> void:
	if not variants.has(part) or active.get(part, "") == v or not variants[part].has(v): return
	for k in variants[part]:
		var node: Node3D = variants[part][k]
		if node: node.visible = (k == v)
	active[part] = v


static func _smooth(x: float) -> float:
	x = clampf(x, 0.0, 1.0)
	return x * x * (3.0 - 2.0 * x)


static func _wrap(a: float) -> float:
	return wrapf(a, -PI, PI)


static func _q(e: Vector3) -> Quaternion:
	return Quaternion(Basis.from_euler(e, EULER_ORDER_XYZ))


## The gait for one leg at phase q (0 = the foot planted ahead): [thigh, knee, ankle] angles.
static func _leg_gait(q: float, rk: float) -> Vector3:
	var d := lerpf(0.62, 0.4, rk)
	var af := lerpf(0.36, 0.86, rk)
	var ab := lerpf(0.3, 0.6, rk)
	var ksw := lerpf(0.95, 2.05, rk)
	var kst := lerpf(0.08, 0.38, rk)
	var th: float
	var kn: float
	var ft: float
	if q < d:
		var s := q / d
		th = lerpf(-af, ab, s)
		kn = 0.05 + kst * sin(PI * s)
		ft = -(th + kn)
		if s < 0.15: ft -= 0.22 * (1.0 - s / 0.15) * (1.0 - rk)
		if s > 0.72: ft += 0.85 * _smooth((s - 0.72) / 0.28)
	else:
		var s := (q - d) / (1.0 - d)
		th = lerpf(ab, -af, _smooth(s))
		kn = 0.05 + ksw * pow(sin(PI * minf(1.0, s * 1.12)), 1.3)
		ft = lerpf(0.85 - ab - 0.05, -0.12, _smooth(s))
	return Vector3(th, kn, ft)


# ----------------------------------------------------------------- update --
func update(dt: float, inp: Dictionary) -> void:
	dt = minf(dt, 1.0 / 20.0)
	t += dt
	_move(dt, inp)
	_items(dt)
	_pose(dt)
	_attach()
	_dynamics(dt)
	_face(dt)
	if skel_on: _skeleton_update()


func _move(dt: float, inp: Dictionary) -> void:
	var mx: float = inp.x
	var mz: float = inp.z
	var mag := minf(1.0, Vector2(mx, mz).length())
	var locked: bool = not act.is_empty() and act.lock
	if mag > 0.15 and locked and act_t > 0.12: cancel_action(false)     # input breaks a full-body emote
	locked = not act.is_empty() and act.lock
	if seat != null:
		if mag > 0.3 and sit_t > 0.5: _stand_up()
		else:
			_sit_move(dt)
			return
	sit_k = maxf(0.0, sit_k - dt * 3.0)
	if unseat != null:
		unseat.t += dt
		var k := _smooth(unseat.t / 0.35)
		position.x = lerpf(unseat.from.x, unseat.to.x, k)
		position.z = lerpf(unseat.from.z, unseat.to.z, k)
		if unseat.t >= 0.35: unseat = null
		speed = 0.0
		vel = Vector3.ZERO
		return
	var want := 0.0 if locked else mag * (RUN if inp.run else WALK)
	if mag > 0.12 and not locked: t_yaw = atan2(mx, mz)
	var dy := _wrap(t_yaw - yaw)
	var turn_k := 1.0 - exp(-(lerpf(14.0, 8.0, run_k) if on_ground else 4.0) * dt)
	var step := clampf(dy * turn_k, -11.0 * dt, 11.0 * dt)
	yaw = _wrap(yaw + step)
	yaw_rate += (step / dt - yaw_rate) * (1.0 - exp(-12.0 * dt))
	var align := maxf(0.0, cos(dy))
	var target := want * (0.25 + 0.75 * align)
	var acc := (7.5 if on_ground else 3.0) if target > speed else 11.0
	speed += clampf(target - speed, -acc * dt, acc * dt)
	var v := Vector3(sin(yaw), 0, cos(yaw)) * speed
	accel = Vector3((v.x - vel.x) / dt, 0, (v.z - vel.z) / dt)
	vel = Vector3(v.x, vy, v.z)
	position.x += v.x * dt
	position.z += v.z * dt
	# jump, gravity, the umbrella float, landing
	if inp.jump and on_ground and not locked:
		vy = JUMP_V
		on_ground = false
		air = 0.0
		cancel_action(true)
	floating = not on_ground and vy < 0.0 and inp.jump_held and U.st == "hold" and U.open > 0.8
	if not on_ground:
		air += dt
		vy -= GRAV * dt * (0.35 if floating else 1.0)
		if floating: vy = maxf(vy, FLOAT_V)
		position.y += vy * dt
		if position.y <= 0.0:
			position.y = 0.0
			on_ground = true
			var hit := -vy
			land_k = clampf(hit / 7.0, 0.25, 1.0)
			if hit > 2.5: fx.dust(position, 8, 0.6)
			vy = 0.0
	position = main.collide(position, 0.28)
	land_k = maxf(0.0, land_k - dt * 3.2)
	# the gait's phase: by distance, plus little steps when turning on the spot
	var cyc := lerpf(1.2, 2.3, run_k)
	run_k += (_smooth((speed - WALK * 1.1) / (RUN * 0.72 - WALK * 1.1)) - run_k) * (1.0 - exp(-8.0 * dt))
	move_k += (_smooth(speed / 0.55) - move_k) * (1.0 - exp(-10.0 * dt))
	step_k += (clampf(absf(yaw_rate) / 5.0, 0.0, 1.0) * (1.0 - move_k) - step_k) * (1.0 - exp(-8.0 * dt))
	if on_ground:
		var before := phase
		phase = fmod(phase + speed * dt / cyc + step_k * dt * 1.8, 1.0)
		if run_k > 0.6 and ((before < 0.05 and phase >= 0.05) or (before < 0.55 and phase >= 0.55)):
			fx.dust(_foot_world("L" if phase < 0.5 else "R"), 2, 0.25)       # dust kicks on hard running steps
	idle_t = idle_t + dt if (move_k < 0.05 and act.is_empty() and on_ground) else 0.0
	if idle_t > 7.0:
		idle_t = 0.0
		_fidget()
	rotation.y = yaw


func _sit_move(dt: float) -> void:
	sit_t += dt
	speed = 0.0
	vel = Vector3.ZERO
	accel = Vector3.ZERO
	var k := _smooth(sit_t / 0.55)
	sit_k = minf(1.0, sit_t / 0.55)
	position.x = lerpf(sit_from.x, seat.x, k)
	position.z = lerpf(sit_from.z, seat.z, k)
	yaw = _wrap(yaw + _wrap(seat.yaw - yaw) * (1.0 - exp(-10.0 * dt)))
	t_yaw = yaw
	rotation.y = yaw
	move_k += (0.0 - move_k) * (1.0 - exp(-10.0 * dt))
	run_k = 0.0
	step_k = 0.0
	on_ground = true
	vy = 0.0


func _fidget() -> void:
	var pool := ["lookAround", "hatFix", "heelRock"]
	if U.st == "hold" and U.open_t > 0.5: pool.append_array(["lazyTwirl", "lazyTwirl"])
	play(pool[randi() % pool.size()])


# ------------------------------------------------------------------- pose --
func _pose(dt: float) -> void:
	var E := {}
	for n in DRIVEN: E[n] = Vector3.ZERO
	var mk := move_k
	var rk := run_k
	var hips_extra := 0.0

	# idle (always underneath)
	var br := sin(t * 2.1)
	var sw := sin(t * 0.7)
	E.hips = Vector3(0, sw * 0.04, sw * 0.035)
	E.spine = Vector3(0.02, -sw * 0.03, -sw * 0.02)
	E.chest = Vector3(br * 0.018, 0, 0)
	E.head = Vector3(-0.02, sin(t * 0.37) * 0.08, 0.07 + sin(t * 0.5) * 0.02)
	E.uArmL = Vector3(-0.08, 0, 0.5 + br * 0.015)
	E.fArmL = Vector3(-0.55, 0, 0)
	E.handL = Vector3(0, 0.2, -0.15)
	E.uArmR = Vector3(-0.08, 0, -0.5 - br * 0.015)
	E.fArmR = Vector3(-0.55, 0, 0)
	E.handR = Vector3(0, -0.2, 0.15)
	E.thighL = Vector3(0.02, -0.08, 0.04 - sw * 0.035)
	E.shinL = Vector3(0.04, 0, 0)
	E.footL = Vector3(-0.06, 0.08, sw * 0.035 - 0.04)
	E.thighR = Vector3(-0.05, 0.08, -0.04 - sw * 0.035)
	E.shinR = Vector3(0.22, 0, 0)
	E.footR = Vector3(-0.17, -0.08, sw * 0.035 + 0.04)

	# walk / run
	if mk > 0.001 or step_k > 0.001:
		var amp := maxf(mk, step_k * 0.45)
		var gl := _leg_gait(phase, rk)
		var gr := _leg_gait(fmod(phase + 0.5, 1.0), rk)
		var ph := phase * TAU
		var pyaw := sin(ph) * lerpf(0.12, 0.2, rk)
		var W := {
			"thighL": Vector3(gl.x, 0, 0.03), "shinL": Vector3(gl.y, 0, 0), "footL": Vector3(gl.z, 0, -0.02),
			"thighR": Vector3(gr.x, 0, -0.03), "shinR": Vector3(gr.y, 0, 0), "footR": Vector3(gr.z, 0, 0.02),
			"hips": Vector3(0, -pyaw, cos(ph) * lerpf(0.05, 0.03, rk)),
			"spine": Vector3(lerpf(0.04, 0.16, rk), pyaw * 0.55, -cos(ph) * 0.03),
			"chest": Vector3(lerpf(0.0, 0.06, rk), pyaw * 0.5, 0),
			"head": Vector3(-lerpf(0.03, 0.18, rk), pyaw * 0.1, cos(ph) * 0.03),
			"uArmL": Vector3(lerpf(-0.05, -0.25, rk) + gl.x * lerpf(0.65, 1.0, rk), 0, lerpf(0.48, 0.32, rk)),
			"fArmL": Vector3(lerpf(-0.4, -1.45, rk) - maxf(0.0, -gl.x) * 0.4, 0, 0),
			"uArmR": Vector3(lerpf(-0.05, -0.25, rk) + gr.x * lerpf(0.65, 1.0, rk), 0, -lerpf(0.48, 0.32, rk)),
			"fArmR": Vector3(lerpf(-0.4, -1.45, rk) - maxf(0.0, -gr.x) * 0.4, 0, 0),
			"handL": Vector3(-0.1, 0.1, -0.1), "handR": Vector3(-0.1, -0.1, 0.1),
		}
		for n in W: E[n] = (E[n] as Vector3).lerp(W[n], amp)
		hips_extra += rk * absf(sin(ph)) * 1.2 * mk

	# air
	if not on_ground:
		var k := _smooth(air / 0.12)
		var A := {}
		if vy > 0.0:
			A = { "thighL": Vector3(-0.75, 0, 0.06), "shinL": Vector3(1.25, 0, 0), "footL": Vector3(0.35, 0, 0),
				"thighR": Vector3(-0.2, 0, -0.06), "shinR": Vector3(0.65, 0, 0), "footR": Vector3(0.4, 0, 0),
				"uArmL": Vector3(-0.5, 0, 0.95), "fArmL": Vector3(-0.7, 0, 0), "uArmR": Vector3(-0.5, 0, -0.95), "fArmR": Vector3(-0.7, 0, 0),
				"spine": Vector3(0.08, 0, 0), "head": Vector3(-0.1, 0, 0) }
		else:
			A = { "thighL": Vector3(-0.35, 0, 0.08), "shinL": Vector3(0.45, 0, 0), "footL": Vector3(0.25, 0, 0),
				"thighR": Vector3(-0.1, 0, -0.08), "shinR": Vector3(0.3, 0, 0), "footR": Vector3(0.25, 0, 0),
				"uArmL": Vector3(-0.3, 0, 1.25), "fArmL": Vector3(-0.35, 0, 0), "uArmR": Vector3(-0.3, 0, -1.25), "fArmR": Vector3(-0.35, 0, 0),
				"head": Vector3(0.06, 0, 0) }
		for n in A: E[n] = (E[n] as Vector3).lerp(A[n], k)

	# the landing squash
	if land_k > 0.0:
		var k := sin(land_k * PI * 0.5)
		E.thighL += Vector3(-0.55 * k, 0, 0); E.shinL += Vector3(1.05 * k, 0, 0); E.footL += Vector3(-0.5 * k, 0, 0)
		E.thighR += Vector3(-0.5 * k, 0, 0); E.shinR += Vector3(1.0 * k, 0, 0); E.footR += Vector3(-0.5 * k, 0, 0)
		E.spine += Vector3(0.18 * k, 0, 0); E.head += Vector3(-0.15 * k, 0, 0)
		E.uArmL += Vector3(0, 0, 0.35 * k); E.uArmR += Vector3(0, 0, -0.35 * k)

	# sitting
	if seat != null or sit_k > 0.0:
		var k := _smooth(sit_k) if seat != null else sit_k
		var sl := sin(t * 2.2)
		var sr := sin(t * 2.2 + 1.3)
		var SIT := { "hips": Vector3(-0.05, 0, 0), "spine": Vector3(0.06, 0, 0), "chest": Vector3(-0.03, 0, 0),
			"thighL": Vector3(-1.45, -0.08, 0.06), "shinL": Vector3(1.25 + sl * 0.25, 0, 0), "footL": Vector3(0.15, 0, 0),
			"thighR": Vector3(-1.45, 0.08, -0.06), "shinR": Vector3(1.35 + sr * 0.25, 0, 0), "footR": Vector3(0.15, 0, 0),
			"uArmL": Vector3(0.25, 0, 0.55), "fArmL": Vector3(-0.35, 0, 0), "uArmR": Vector3(0.25, 0, -0.55), "fArmR": Vector3(-0.35, 0, 0),
			"head": Vector3(0.04, sin(t * 0.4) * 0.15, 0.12) }
		for n in SIT: E[n] = (E[n] as Vector3).lerp(SIT[n], k)

	# turning: lean in, look ahead
	var lean := clampf(-yaw_rate * speed * 0.025, -0.2, 0.2)
	body.rotation.z += (lean - body.rotation.z) * (1.0 - exp(-8.0 * dt))
	E.head += Vector3(0, clampf(_wrap(t_yaw - yaw) * 0.45, -0.5, 0.5), 0)

	for n in DRIVEN: tq[n] = _q(E[n])
	var hands := { "L": "relax", "R": "relax" }
	if mk > 0.5 and rk > 0.5:
		hands.L = "grip"
		hands.R = "grip"

	# the arm holding the umbrella goes on IK
	for side in ["L", "R"]:
		var holding: bool = U.st != "away" and U.side == side and U.vis > 0.0
		hold_w[side] += ((1.0 if holding else 0.0) - hold_w[side]) * (1.0 - exp(-10.0 * dt))
		if holding: held[side] = true
		if hold_w[side] > 0.001 and held[side]:
			var H := _hold_target(side)
			var R := _solve_arm(side, H.g, H.d, H.f, null)
			var hw: float = hold_w[side]
			tq["uArm" + side] = (tq["uArm" + side] as Quaternion).slerp(R[0], hw)
			tq["fArm" + side] = (tq["fArm" + side] as Quaternion).slerp(R[1], hw)
			tq["hand" + side] = (tq["hand" + side] as Quaternion).slerp(R[2], hw)
			if hw > 0.5: hands[side] = "grip"
		if hold_w[side] < 0.001: held[side] = false

	# the action overlay
	var body_spin := 0.0
	var body_lift := 0.0
	act_face = ""
	if not act.is_empty():
		act_t += dt
		if act_t >= act.dur:
			_end_action()
		else:
			var w := _smooth(minf(minf(act_t / act.get("fi", 0.18), (act.dur - act_t) / act.get("fo", 0.25)), 1.0))
			var O := { "e": {}, "ik": {}, "hands": {}, "face": "", "spin": 0.0, "lift": 0.0, "hips": 0.0 }
			call("_act_" + act.name, act_t, O, act.dur)
			for n in O.e: tq[n] = (tq[n] as Quaternion).slerp(_q(O.e[n]), w)
			for side in O.ik:
				var K: Dictionary = O.ik[side]
				var R := _solve_arm(side, K.g, K.d, K.f, K.get("pole"))
				tq["uArm" + side] = (tq["uArm" + side] as Quaternion).slerp(R[0], w)
				tq["fArm" + side] = (tq["fArm" + side] as Quaternion).slerp(R[1], w)
				tq["hand" + side] = (tq["hand" + side] as Quaternion).slerp(R[2], w)
			if w > 0.4:
				for side in O.hands: hands[side] = O.hands[side]
			if O.face != "" and w > 0.3: act_face = O.face
			body_spin = O.spin
			body_lift = O.lift * w
			hips_extra += O.hips * w
	body.rotation.y = body_spin
	body.position.y += (body_lift * S - body.position.y) * (1.0 - exp(-14.0 * dt))
	set_variant("handL", hands.L)
	set_variant("handR", hands.R)

	# every joint eases toward its target
	var fast := 1.0 - exp(-(30.0 if mk > 0.3 else 16.0) * dt)
	var leg_k := 1.0 - exp(-(45.0 if mk > 0.3 else 18.0) * dt)
	var arm_k := 1.0 - exp(-18.0 * dt)
	for n in DRIVEN:
		var k := fast
		if n.begins_with("thigh") or n.begins_with("shin") or n.begins_with("foot"): k = leg_k
		elif n.contains("Arm") or n.begins_with("hand"): k = arm_k
		var jn: Node3D = P[n]
		jn.quaternion = jn.quaternion.slerp(tq[n], k)

	# keep the lower foot on the ground (or the pelvis on the seat)
	var drop := _ground_drop()
	if not on_ground: drop = minf(0.0, drop * 0.4)
	if seat != null or sit_k > 0.0:
		if seat != null: last_seat = seat
		var s_: Variant = seat if seat != null else last_seat
		var seat_y: float = (float(s_.h) / S + 5.5) - J.pelvis if s_ != null else 0.0
		drop = lerpf(drop, seat_y, _smooth(sit_k) if seat != null else sit_k)
	var want := drop + hips_extra
	hips_cur += (want - hips_cur) * (1.0 - exp(-(30.0 if land_k > 0.0 else 22.0) * dt))
	(P.hips as Node3D).position.y = hips_cur * S


## How far the hips must drop (in voxels) for the lowest point of either foot to touch the ground.
func _ground_drop() -> float:
	var low := 1e9
	for s in ["L", "R"]:
		var hx := 3.0 if s == "L" else -3.0
		var q: Quaternion = (P.hips as Node3D).quaternion * (P["thigh" + s] as Node3D).quaternion
		var knee: Vector3 = q * Vector3(0, -(J.hip - J.knee), 0) + Vector3(hx, J.hip - J.pelvis, 0)
		q = q * (P["shin" + s] as Node3D).quaternion
		var ankle: Vector3 = knee + q * Vector3(0, -(J.knee - J.ankle), 0)
		q = q * (P["foot" + s] as Node3D).quaternion
		for z in [-3.5, 6.5]:
			var p: Vector3 = q * Vector3(0, -J.ankle - 0.5, z) + ankle
			low = minf(low, p.y)
	return (-J.pelvis - 0.5) - low


# ---------------------------------------------------------- secondary motion --
func _init_dynamics() -> void:
	for ch in meta.chains:
		var names: Array = ch.names
		for i in names.size():
			var n: String = names[i]
			var d := { "joint": P[n], "frame": F[n], "ax": 0.0, "az": 0.0, "vx": 0.0, "vz": 0.0, "started": false, "prev": Vector3.ZERO, "pv": Vector3.ZERO, "acc": Vector3.ZERO, "tail": false }
			if ch.kind == "hair":
				var front: bool = ch.get("front", false)
				d.merge({ "k": 90.0 if front else 70.0, "c": 9.0 if front else 8.0, "follow": 0.55 if i == 0 else 0.85, "xmin": -0.7 if front else -0.04, "xmax": 0.12 if front else 0.9, "zlim": 0.45 }, true)
			else:
				d.merge({ "k": 60.0, "c": 7.0, "follow": 0.6, "xmin": 0.0, "xmax": 1.0, "zlim": 0.35, "tail": true }, true)
			dyn.append(d)
	for dg in meta.dangles:
		dyn.append({ "joint": P[dg.name], "frame": F[dg.name], "ax": 0.0, "az": 0.0, "vx": 0.0, "vz": 0.0, "started": false, "prev": Vector3.ZERO, "pv": Vector3.ZERO, "acc": Vector3.ZERO, "tail": false,
			"k": 40.0, "c": 3.2, "follow": 1.0, "xmin": -1.2, "xmax": 1.2, "zlim": 1.0 })
	for p in meta.panels:
		panels.append({ "joint": P[p.name], "th": float(p.th), "f": 0.0, "v": 0.0, "dx": sin(float(p.th)), "dz": cos(float(p.th)) })


func _dynamics(dt: float) -> void:
	var g := Vector3(0, -9.8, 0)
	for d in dyn:
		var fr: Node3D = d.frame
		var p := fr.global_position
		if not d.started:
			d.started = true
			d.prev = p
			d.pv = Vector3.ZERO
		var v: Vector3 = (p - d.prev) / maxf(dt, 0.0001)
		var a: Vector3 = (v - d.pv) / maxf(dt, 0.0001)
		if a.length() > 60.0: a = a.normalized() * 60.0
		d.acc = (d.acc as Vector3).lerp(a, 0.35)
		d.pv = v
		d.prev = p
		var ge: Vector3 = g - d.acc * 0.55 - v * 1.1
		ge = (fr.global_transform.basis.get_rotation_quaternion().inverse() * ge).normalized()
		var tx: float = atan2(-ge.z, -ge.y) * d.follow
		var tz: float = atan2(ge.x, -ge.y) * d.follow
		if d.tail: tx += back_flare * 0.9
		tx = clampf(tx, d.xmin, d.xmax)
		tz = clampf(tz, -d.zlim, d.zlim)
		d.vx += (d.k * (tx - d.ax) - d.c * d.vx) * dt
		d.vz += (d.k * (tz - d.az) - d.c * d.vz) * dt
		d.ax = clampf(d.ax + d.vx * dt, d.xmin - 0.1, d.xmax + 0.1)
		d.az = clampf(d.az + d.vz * dt, -d.zlim - 0.1, d.zlim + 0.1)
		(d.joint as Node3D).quaternion = _q(Vector3(d.ax, 0, d.az))
	# the skirt: each panel flares from the knee and foot under it, a spin, a fall, and the sway
	var knees := []
	for s in ["L", "R"]:
		var tq_: Quaternion = (P["thigh" + s] as Node3D).quaternion
		var k: Vector3 = tq_ * Vector3(0, -14, 0)
		var foot: Vector3 = (tq_ * (P["shin" + s] as Node3D).quaternion) * Vector3(0, -13, 0) + k
		var hx := 3.0 if s == "L" else -3.0
		knees.append([hx + k.x, k.z, hx + foot.x, foot.z])
	var c := cos(-yaw)
	var sn := sin(-yaw)
	var vxl := vel.x * c + vel.z * sn
	var vzl := -vel.x * sn + vel.z * c
	var axl := accel.x * c + accel.z * sn
	var azl := -accel.x * sn + accel.z * c
	var fall := clampf(-vy * 0.11, -0.12, 0.55) if not on_ground else 0.0
	var back := 0.0
	for pn in panels:
		var push := 0.0
		for kn in knees:
			push = maxf(push, maxf((kn[0] * pn.dx + kn[1] * pn.dz - 4.2) * 0.06, (kn[2] * pn.dx + kn[3] * pn.dz - 9.0) * 0.05))
		var tgt: float = 0.02 + push + fall
		if absf(pn.dx) > 0.6: tgt += 0.45 * panel_lift
		tgt += clampf(-(axl * pn.dx + azl * pn.dz) * 0.018, -0.12, 0.25)
		tgt += clampf(-(vxl * pn.dx + vzl * pn.dz) * 0.035, -0.14, 0.22)
		pn.v += (150.0 * (tgt - pn.f) - 13.0 * pn.v) * dt
		pn.f = clampf(pn.f + pn.v * dt, -0.2, 1.3)
		(pn.joint as Node3D).quaternion = Quaternion(Vector3.RIGHT, -pn.f)
		if cos(pn.th) < -0.75: back = maxf(back, pn.f)
	back_flare = back


# ------------------------------------------------------------------- face --
func _face(dt: float) -> void:
	var f := act_face if act_face != "" else face_base
	if act_face == "" and floating: f = "happy"
	blink_t -= dt
	if blink_t <= 0.0:
		blinking = 0.13
		blink_t = 2.0 + randf() * 3.5
	if blinking > 0.0:
		blinking -= dt
		if f in ["smug", "smile", "pout", "surprised"]: f = "blink"
	set_variant("head", f)


# ----------------------------------------------------------- what the player does --
func toggle_item() -> void:
	if U.st == "away":
		U.st = "hold"
		U.open_t = 0.0
		_appear()
	else:
		U.st = "leaving"
		U.open_t = 0.0
	cancel_action(true)


func toggle_open() -> void:
	if U.st == "away" or U.st == "leaving":
		U.st = "hold"
		_appear()
		U.open_t = 1.0
		return
	if U.st == "carry": U.st = "hold"
	U.open_t = 0.0 if U.open_t > 0.5 else 1.0


func cycle_tilt() -> void:
	if U.open_t > 0.5: U.tilt = (U.tilt + 1) % 3


func toggle_carry() -> void:
	if U.st == "hold" and U.open_t <= 0.5: U.st = "carry"
	elif U.st == "carry": U.st = "hold"
	elif U.st == "hold" and U.open_t > 0.5:
		U.open_t = 0.0
		U.st = "carry"


func trick() -> void:
	if U.st == "hold" and U.open_t > 0.5: play("umbrellaTwirl")
	elif U.st == "hold" or U.st == "carry": play("enGarde")
	else: play("cardFan")


func play(name: String) -> void:
	if seat != null or not ACTIONS.has(name): return
	if not act.is_empty() and act.name == name and act_t < act.dur * 0.6: return
	if not act.is_empty(): _end_action()
	act = ACTIONS[name].duplicate()
	act.name = name
	act_t = 0.0
	idle_t = 0.0
	if has_method("_start_" + name): call("_start_" + name)


func cancel_action(soft: bool) -> void:
	if not act.is_empty(): _end_action()


func _end_action() -> void:
	if has_method("_end_" + act.name): call("_end_" + act.name)
	act = {}


func sit_toggle() -> void:
	if seat != null:
		_stand_up()
		return
	var s_ = near_seat()
	if s_ == null: return
	cancel_action(false)
	seat = s_
	sit_from = position
	sit_t = 0.0


func _stand_up() -> void:
	var s_ = seat
	seat = null
	unseat = { "from": position, "to": Vector3(s_.x + sin(s_.yaw) * 0.55, 0, s_.z + cos(s_.yaw) * 0.55), "t": 0.0 }


func near_seat():
	var best = null
	var bd := 1.6
	for s_ in main.seats():
		var d := Vector2(s_.x - position.x, s_.z - position.z).length()
		if d < bd:
			bd = d
			best = s_
	return best


## What the HUD shows.
func status() -> Dictionary:
	var us := "Away"
	if U.st == "carry": us = "Carried"
	elif U.st == "hold": us = ["Open · shoulder", "Open · overhead", "Open · in front"][U.tilt] if U.open_t > 0.5 else "Closed · in hand"
	return { "umbrella": us, "face": face_base, "seat": seat != null, "near": seat == null and near_seat() != null, "floating": floating }


# ------------------------------------------------------------------ the IK --
## side "L"/"R"; g: where the fist closes (chest space, voxels); d: which way the umbrella (and the thumb side of the
## fist) points; f: roughly where the fingers point. Returns the local rotations [upper arm, forearm, hand].
func _solve_arm(side: String, g: Vector3, d: Vector3, f: Vector3, pole) -> Array:
	var sx := 1.0 if side == "L" else -1.0
	var zh := d.normalized()
	var yh := -f
	yh -= zh * yh.dot(zh)
	if yh.length_squared() < 0.000001: yh = Vector3(0, 1, 0) - zh * zh.y
	yh = yh.normalized()
	var xh := yh.cross(zh)
	var qh := Quaternion(Basis(xh, yh, zh))
	var w := g - qh * Vector3(0, -GRIP, 0)               # the wrist sits up the fist from the grip
	var sh: Vector3 = SH[side]
	var dv := w - sh
	var d0 := clampf(dv.length(), 2.0, UPPER + FORE - 0.05)
	var u := dv.normalized()
	var pp: Vector3 = pole if pole != null else Vector3(sx * 0.55, -0.35, -0.75)   # elbows tuck down, back and out
	var v := pp - u * pp.dot(u)
	if v.length_squared() < 0.000001: v = Vector3(0, 0, -1)
	v = v.normalized()
	var ca := clampf((UPPER * UPPER + d0 * d0 - FORE * FORE) / (2.0 * UPPER * d0), -1.0, 1.0)
	var sa := sqrt(1.0 - ca * ca)
	var e := sh + u * (UPPER * ca) + v * (UPPER * sa)
	var wc := sh + u * d0
	var down := (e - sh).normalized()
	var fa := (wc - e).normalized()
	var zu := fa - down * fa.dot(down)
	if zu.length_squared() < 0.00001: zu = Vector3(0, 0, 1) - down * down.z
	zu = zu.normalized()
	var yu := -down
	var xu := yu.cross(zu)
	var qu := Quaternion(Basis(xu, yu, zu))
	var qf := Quaternion(Vector3.RIGHT, -acos(clampf(fa.dot(down), -1.0, 1.0)))
	return [qu, qf, (qu * qf).inverse() * qh]


static func _mir(side: String, x: float, y: float, z: float) -> Vector3:
	return Vector3(x if side == "L" else -x, y, z)


# ------------------------------------------------------------ the umbrella --
func _appear() -> void:
	U.vis = maxf(U.vis, 0.001)
	umb_grip.visible = true
	fx.card_puff(_hand_world(U.side), 9)


func _items(dt: float) -> void:
	U.side = "R"
	if U.st == "leaving":
		U.vis -= dt * 4.5
		if U.vis <= 0.0:
			U.vis = 0.0
			U.st = "away"
			umb_grip.visible = false
			fx.card_puff(_hand_world(U.side), 7)
	elif U.st != "away":
		U.vis = minf(1.0, U.vis + dt * 4.0)
	var sc: float = 0.001 if U.vis <= 0.0 else (_smooth(U.vis) * (1.0 + sin(U.vis * PI) * 0.25) if U.vis < 1.0 else 1.0)
	umb.scale = Vector3.ONE * maxf(0.001, sc)
	# the canopy opens and closes on its hinges, and twirls about the shaft
	var target: float = U.open_t if (U.st == "hold" or U.st == "leaving") else 0.0
	U.open += clampf(target - U.open, -dt * 3.2, dt * 3.2)
	_umb_set_open(clampf(U.open, 0.0, 1.0))
	U.cspin += U.spin_v * dt
	U.spin_v *= exp(-dt * 1.2)
	umb_canopy.rotation.y = U.cspin


## t: 0 closed .. 1 open. Closed, each panel hangs down along the shaft, squeezed thin; the top bow folds away.
func _umb_set_open(t_: float) -> void:
	var e := t_ * t_ * (3.0 - 2.0 * t_)
	var ang := (1.0 - e) * 0.98
	var sq := 0.13 + 0.87 * pow(e, 0.7)
	for f in umb_folds:
		(f as Node3D).rotation = Vector3(ang, 0, 0)
		(f as Node3D).scale = Vector3(sq, 1, 1.0 - (1.0 - e) * 0.08)
	if umb_bow: umb_bow.scale = Vector3.ONE * (0.25 + 0.75 * e)


## Where the hand wants to be for the umbrella (chest space, voxels): grip point g, umbrella direction d, fingers f.
func _hold_target(side: String) -> Dictionary:
	var sx := 1.0 if side == "L" else -1.0
	var swing := sin(phase * TAU + (0.0 if side == "R" else PI)) * move_k
	if U.st == "carry":
		return { "g": _mir(side, 5, 1.5 + swing * 0.5, 7.5), "d": Vector3(sx * 0.35, 0.7, -0.62), "f": Vector3(-sx, 0.2, 0) }
	if U.open < 0.35 and U.open_t < 0.5:
		return { "g": _mir(side, 10.5, -7 + swing * 1.2, 10.5 + swing * 3.5 * (1.0 - run_k)), "d": Vector3(sx * 0.03, -1, 0.1 - swing * 0.1), "f": Vector3(-sx, 0, 0.35) }
	if floating or (not on_ground and U.open > 0.8):
		return { "g": _mir(side, 8.5, 25, 1.5), "d": Vector3(-sx * 0.16, 1, 0), "f": Vector3(-sx, 0, 0.3) }
	var bob := sin(t * 1.7) * 0.4 + swing * 0.6
	if U.tilt == 1: return { "g": _mir(side, 11, 17 + bob, 4), "d": Vector3(-sx * 0.28, 1, -0.05), "f": Vector3(-sx, 0, 0.3) }
	if U.tilt == 2: return { "g": _mir(side, 7, 3 + bob, 9.5), "d": Vector3(sx * 0.2, 0.78, 0.6), "f": Vector3(-sx, 0, 0) }
	return { "g": _mir(side, 7, 0.5 + bob, 7.5), "d": Vector3(sx * 0.38, 0.84, -0.42 - run_k * 0.2), "f": Vector3(-sx, -0.1, 0.25) }


func _attach() -> void:
	var hand: Node3D = P["hand" + U.side]
	if umb_grip.get_parent() != hand: umb_grip.reparent(hand, false)
	umb_grip.position = Vector3(0, -GRIP * S, 0)
	umb_grip.quaternion = Quaternion(Vector3.RIGHT, PI / 2.0 + U.spin)


func _hand_world(side: String) -> Vector3:
	return (P["hand" + side] as Node3D).to_global(Vector3(0, -GRIP * S, 0))


func _foot_world(side: String) -> Vector3:
	return (P["foot" + side] as Node3D).to_global(Vector3(0, -7 * S, 2 * S))


# ---------------------------------------------------------------- the emotes --
# _act_<name>(t, O, dur): O.e[part] = Euler, O.ik[side] = {g, d, f, pole}, O.hands[side], O.face, O.spin, O.lift, O.hips
func _free() -> String:
	return "L" if U.st != "away" and U.st != "leaving" else "R"


## a real wave: the elbow out to her side, held still, the forearm swinging about it, the hand in line, palm out
func _act_wave(t_: float, O: Dictionary, _dur: float) -> void:
	var s_ := _free()
	var sx := 1.0 if s_ == "L" else -1.0
	var ph := maxf(0.0, t_ - 0.2) * 12.5
	var ramp := minf(1.0, t_ / 0.35)
	var a := 0.42 * sin(ph) * ramp
	var b := a + 0.2 * sin(ph - 1.2) * ramp
	var sh: Vector3 = SH[s_]
	var e := sh + Vector3(sx * 0.6, -0.65, 0.45).normalized() * UPPER
	var fore := Vector3(sx * sin(a), cos(a), 0.12).normalized()
	var w := e + fore * FORE
	var f := Vector3(sx * sin(b), cos(b), 0.12).normalized()
	var d := Vector3(-sx * cos(b), sin(b), 0)
	O.ik[s_] = { "g": w + f * GRIP, "d": d, "f": f, "pole": e - (sh + w) * 0.5 }
	O.hands[s_] = "open"
	O.face = "smile"
	O.e.head = Vector3(-0.03, sx * 0.12, sx * 0.16)
	O.e.chest = Vector3(0, sx * 0.08, -sx * 0.04)


func _act_point(t_: float, O: Dictionary, _dur: float) -> void:
	var thrust := minf(1.0, t_ / 0.25)
	O.ik.R = { "g": _mir("R", 8, 4.5, 10 + thrust * 7), "d": Vector3(0, 1, 0), "f": Vector3(0, -0.1, 1), "pole": Vector3(-1, -0.5, -0.5) }
	O.hands.R = "point"
	if hold_w.L < 0.5:
		O.ik.L = { "g": _mir("L", 7.5, -5, 1.5), "d": Vector3(0, 1, -0.4), "f": Vector3(-1, -0.4, 0), "pole": Vector3(1, 0.2, -0.6) }
		O.hands.L = "relax"
	O.e.chest = Vector3(0, -0.25, 0)
	O.e.head = Vector3(0.02, 0.15, 0.1)
	O.face = "smug"


func _act_curtsy(t_: float, O: Dictionary, dur: float) -> void:
	var k := sin(clampf((t_ - 0.25) / (dur - 0.6), 0.0, 1.0) * PI)
	for s_ in ["L", "R"]:
		O.ik[s_] = { "g": _mir(s_, 13.5, -10 + k * 3, 4.5), "d": Vector3(0, 0.3, 1), "f": Vector3(0, -1, 0.2), "pole": Vector3(1 if s_ == "L" else -1, -0.2, -0.6) }
	O.hands.L = "grip"
	O.hands.R = "grip"
	O.e.thighR = Vector3(0.35 * k, 0.2 * k, 0.15 * k)
	O.e.shinR = Vector3(0.9 * k, 0, 0)
	O.e.footR = Vector3(0.3 * k, 0, 0)
	O.e.thighL = Vector3(-0.3 * k, 0, 0)
	O.e.shinL = Vector3(0.75 * k, 0, 0)
	O.e.footL = Vector3(-0.45 * k, 0, 0)
	O.e.spine = Vector3(0.18 * k, 0, 0)
	O.e.chest = Vector3(0.08 * k, 0, 0)
	O.e.head = Vector3(0.3 * k, 0, 0.1 * k)
	O.face = "happy" if k > 0.3 else "smile"
	panel_lift = k


func _end_curtsy() -> void:
	panel_lift = 0.0


func _act_spin(t_: float, O: Dictionary, dur: float) -> void:
	O.spin = _smooth((t_ - 0.08) / (dur - 0.2)) * TAU
	var up := sin(clampf(t_ / dur, 0.0, 1.0) * PI)
	if hold_w.L < 0.5:
		O.e.uArmL = Vector3(-0.2, 0, 1.2 * up + 0.4)
		O.e.fArmL = Vector3(-0.3, 0, 0)
		O.hands.L = "open"
	if hold_w.R < 0.5:
		O.e.uArmR = Vector3(-0.2, 0, -1.2 * up - 0.4)
		O.e.fArmR = Vector3(-0.3, 0, 0)
		O.hands.R = "open"
	O.e.footL = Vector3(0.5 * up, 0, 0)
	O.e.footR = Vector3(0.5 * up, 0, 0)
	O.e.thighR = Vector3(0.1, 0, -0.1 * up)
	O.e.shinR = Vector3(0.6 * up, 0, 0)
	O.e.head = Vector3(-0.08 * up, 0, 0.12)
	O.lift = 2.2 * up
	O.face = "happy"
	if U.open > 0.5: U.spin_v = maxf(U.spin_v, 9.0)


func _act_peace(t_: float, O: Dictionary, _dur: float) -> void:
	var s_ := "L" if hold_w.R > 0.5 else "R"
	var sx := 1.0 if s_ == "L" else -1.0
	var o := "R" if s_ == "L" else "L"
	O.ik[s_] = { "g": _mir(s_, 6.5, 13, 9), "d": Vector3(-sx * 0.4, 0.1, 1), "f": Vector3(0, 1, 0.1), "pole": Vector3(sx, -0.8, 0) }
	O.hands[s_] = "peace"
	if hold_w[o] < 0.5:
		O.ik[o] = { "g": _mir(o, 8, -5, 1.5), "d": Vector3(0, 1, -0.4), "f": Vector3(-1 if o == "L" else 1, -0.4, 0), "pole": Vector3(1 if o == "L" else -1, 0.2, -0.6) }
	var kick := _smooth((t_ - 0.1) / 0.3)
	var leg := "L" if s_ == "R" else "R"
	O.e["thigh" + leg] = Vector3(0.35 * kick, 0, 0)
	O.e["shin" + leg] = Vector3(1.4 * kick, 0, 0)
	O.e["foot" + leg] = Vector3(0.5 * kick, 0, 0)
	O.e.spine = Vector3(0.04, 0, sx * 0.08)
	O.e.head = Vector3(0.02, -sx * 0.1, sx * 0.22)
	O.face = "wink"


func _act_hatTip(t_: float, O: Dictionary, dur: float) -> void:
	var s_ := "R" if (hold_w.L > 0.5 and hold_w.R < 0.5) else "L"
	var sx := 1.0 if s_ == "L" else -1.0
	var k := sin(clampf(t_ / dur, 0.0, 1.0) * PI)
	O.ik[s_] = { "g": _mir(s_, 6.5, 21 + k, 7), "d": Vector3(-sx, 0.1, 0.2), "f": Vector3(0, 0.3, 1), "pole": Vector3(sx, -0.5, -0.3) }
	O.hands[s_] = "grip"
	O.e.hat = Vector3(0.35 * k, 0, sx * 0.1 * k)
	O.e.head = Vector3(0.22 * k, 0, 0)
	O.e.spine = Vector3(0.08 * k, 0, 0)
	O.face = "smug"


func _act_lookAround(t_: float, O: Dictionary, dur: float) -> void:
	var p := t_ / dur
	O.e.head = Vector3(0.02, sin(p * TAU) * 0.6, sin(p * TAU) * 0.08 + 0.05)
	O.e.chest = Vector3(0, sin(p * TAU) * 0.12, 0)
	if p > 0.35 and p < 0.6: O.face = "surprised"


func _act_hatFix(t_: float, O: Dictionary, dur: float) -> void:
	var s_ := "R" if hold_w.L > 0.5 else "L"
	if hold_w[s_] > 0.5: return
	var sx := 1.0 if s_ == "L" else -1.0
	var k := sin(clampf(t_ / dur, 0.0, 1.0) * PI)
	O.ik[s_] = { "g": _mir(s_, 8.5, 22, 1 + sin(t_ * 8) * 1.2), "d": Vector3(-sx, 0.3, 0), "f": Vector3(0, 1, 0.3), "pole": Vector3(sx, -0.4, -0.4) }
	O.hands[s_] = "grip"
	O.e.hat = Vector3(0, 0, sx * 0.12 * k + sin(t_ * 8) * 0.04 * k)
	O.e.head = Vector3(-0.06 * k, 0, -sx * 0.1 * k)
	O.face = "smile"


func _act_heelRock(t_: float, O: Dictionary, _dur: float) -> void:
	var r := sin(t_ * 4.8)
	var f := maxf(0.0, r) * 0.45 - maxf(0.0, -r) * 0.25
	O.e.footL = Vector3(f, 0, 0)
	O.e.footR = Vector3(f, 0, 0)
	if hold_w.L < 0.5:
		O.ik.L = { "g": Vector3(3, -9, -6), "d": Vector3(0, 0, -1), "f": Vector3(-1, 0, 0) }
		O.hands.L = "relax"
	if hold_w.R < 0.5:
		O.ik.R = { "g": Vector3(-3, -9, -6), "d": Vector3(0, 0, -1), "f": Vector3(1, 0, 0) }
		O.hands.R = "relax"
	O.e.head = Vector3(0, 0, sin(t_ * 2.4) * 0.1)
	O.face = "smile"
	O.hips = maxf(0.0, r) * 1.3


func _act_lazyTwirl(_t: float, O: Dictionary, _dur: float) -> void:
	U.spin_v = maxf(U.spin_v, 4.0)
	O.e.head = Vector3(0, 0.2, 0.15)
	O.face = "smile"


func _act_umbrellaTwirl(t_: float, O: Dictionary, _dur: float) -> void:
	U.spin_v = 14.0
	var sw := sin(t_ * 5.0)
	O.e.hips = Vector3(0, sw * 0.15, sw * 0.06)
	O.e.spine = Vector3(0, -sw * 0.1, -sw * 0.08)
	O.e.head = Vector3(0, sw * 0.2, 0.15 * sw)
	var o := "L" if U.side == "R" else "R"
	if hold_w[o] < 0.5:
		O.e["uArm" + o] = Vector3(-0.3, 0, (1.0 if o == "L" else -1.0) * (0.9 + sw * 0.2))
		O.e["fArm" + o] = Vector3(-0.5, 0, 0)
		O.hands[o] = "open"
	O.e.footL = Vector3(0.25 * maxf(0.0, sw), 0, 0)
	O.e.footR = Vector3(0.25 * maxf(0.0, -sw), 0, 0)
	O.face = "happy"


func _start_enGarde() -> void:
	if U.st == "carry": U.st = "hold"
	U.open_t = 0.0


func _act_enGarde(t_: float, O: Dictionary, _dur: float) -> void:
	var s_: String = U.side
	var sx := 1.0 if s_ == "L" else -1.0
	var o := "R" if s_ == "L" else "L"
	var thr := maxf(0.0, sin((t_ - 0.5) * PI * 4.0)) if (t_ > 0.5 and t_ < 1.5) else 0.0
	O.ik[s_] = { "g": _mir(s_, 6, 3, 11 + thr * 6), "d": Vector3(0, 0.08, 1), "f": Vector3(-sx, 0, 0), "pole": Vector3(sx, -0.6, -0.3) }
	if hold_w[o] < 0.5:
		O.ik[o] = { "g": _mir(o, 9, 16, -6), "d": Vector3(0, 1, 0), "f": Vector3(0, 1, -0.3), "pole": Vector3(1 if o == "L" else -1, -0.2, 0.3) }
		O.hands[o] = "open"
	var lg := s_
	var bk := o
	O.e["thigh" + lg] = Vector3(-0.55 - thr * 0.15, 0, 0)
	O.e["shin" + lg] = Vector3(0.6 + thr * 0.15, 0, 0)
	O.e["foot" + lg] = Vector3(-0.05, 0, 0)
	O.e["thigh" + bk] = Vector3(0.35, 0, 0)
	O.e["shin" + bk] = Vector3(0.25, 0, 0)
	O.e["foot" + bk] = Vector3.ZERO
	O.e.hips = Vector3(0, sx * 0.5, 0)
	O.e.spine = Vector3(0.05, sx * 0.3, 0)
	O.e.chest = Vector3(0, sx * 0.25, 0)
	O.e.head = Vector3(0, -sx * 0.95, 0)
	O.face = "pout" if (t_ > 0.5 and t_ < 1.6) else "smug"


func _act_cardFan(t_: float, O: Dictionary, dur: float) -> void:
	O.ik.R = { "g": Vector3(-7, 9 + minf(1.0, t_ * 2.0) * 2.0, 11), "d": Vector3(0.3, 0.2, 1), "f": Vector3(0, 1, 0.2), "pole": Vector3(-1, -0.6, -0.2) }
	O.hands.R = "grip"
	O.ik.L = { "g": Vector3(7.5, -5, 1.5), "d": Vector3(0, 1, -0.4), "f": Vector3(-1, -0.4, 0), "pole": Vector3(1, 0.2, -0.6) }
	O.e.head = Vector3(0.05, 0.12, -0.15)
	O.face = "smug" if t_ < 1.6 else "wink"
	fx.fan(self, t_, dur)


func _end_cardFan() -> void:
	fx.fan_end(self, false)


# --------------------------------------------------------- the skeleton view --
func set_skeleton(on: bool) -> void:
	skel_on = on
	for m in mats:
		var bm := m as BaseMaterial3D
		bm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA if on else BaseMaterial3D.TRANSPARENCY_DISABLED
		bm.albedo_color = Color(1, 1, 1, 0.16 if on else 1.0)
	if on and skel_lines == null:
		for n in meta.order:
			if meta.joints[n].parent != null: skel_pairs.append([meta.joints[n].parent, n])
		var lm := StandardMaterial3D.new()
		lm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		lm.no_depth_test = true
		lm.albedo_color = Color("8fd0ff")
		skel_lines = MeshInstance3D.new()
		skel_lines.mesh = ImmediateMesh.new()
		skel_lines.material_override = lm
		skel_lines.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		skel_lines.top_level = true
		add_child(skel_lines)
		var dm := StandardMaterial3D.new()
		dm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		dm.no_depth_test = true
		var box := BoxMesh.new()
		box.size = Vector3.ONE * 0.022
		box.material = dm
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.mesh = box
		mm.instance_count = meta.order.size()
		skel_dots = MultiMeshInstance3D.new()
		skel_dots.multimesh = mm
		skel_dots.top_level = true
		skel_dots.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		add_child(skel_dots)
	if skel_lines:
		skel_lines.visible = on
		skel_dots.visible = on


func _skeleton_update() -> void:
	var im := skel_lines.mesh as ImmediateMesh
	im.clear_surfaces()
	im.surface_begin(Mesh.PRIMITIVE_LINES)
	for pr in skel_pairs:
		im.surface_add_vertex((P[pr[0]] as Node3D).global_position)
		im.surface_add_vertex((P[pr[1]] as Node3D).global_position)
	im.surface_end()
	var i := 0
	for n in meta.order:
		skel_dots.multimesh.set_instance_transform(i, Transform3D(Basis.IDENTITY, (P[n] as Node3D).global_position))
		i += 1
