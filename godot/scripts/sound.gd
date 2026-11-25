extends Node
## Sounds and music (assets/audio, made by tools/make_audio.py): one-shots, some with variations and a place in the world;
## music and the air of a place, each crossfading into the next.

var bank := {}                        # name -> [streams]
var voices: Array[AudioStreamPlayer] = []
var v3: Array[AudioStreamPlayer3D] = []
var mus: Array = []                   # [{ p, to }]
var amb: Array = []
var mus_name := ""
var amb_name := ""
var mus_db := -9.0
var rng := RandomNumberGenerator.new()
var hush := 0.0


func setup() -> void:
	for f in DirAccess.get_files_at("res://assets/audio"):
		var n := f.trim_suffix(".import").trim_suffix(".remap")
		if not (n.ends_with(".ogg") or n.ends_with(".wav")): continue
		var base := n.get_basename()
		var key := base.rstrip("0123456789")
		var st = load("res://assets/audio/" + n)
		if st == null: continue
		if not bank.has(key): bank[key] = []
		if not (st in bank[key]): bank[key].append(st)
	for i in 14:
		var p := AudioStreamPlayer.new()
		add_child(p)
		voices.append(p)
	for i in 10:
		var p := AudioStreamPlayer3D.new()
		p.unit_size = 5.0
		p.max_distance = 40.0
		add_child(p)
		v3.append(p)


func play(n: String, at = null, db := 0.0) -> void:
	if not bank.has(n): return
	var st = bank[n][rng.randi() % bank[n].size()]
	if at != null:
		for p in v3:
			if not p.playing:
				p.stream = st
				p.volume_db = db
				p.global_position = at
				p.play()
				return
		return
	for p in voices:
		if not p.playing:
			p.stream = st
			p.volume_db = db
			p.pitch_scale = 1.0 if not n.begins_with("voice") and not n.begins_with("step") else 0.94 + rng.randf() * 0.12
			p.play()
			return


func music(n: String) -> void:
	if n == mus_name: return
	mus_name = n
	for m in mus: m.to = 0.0
	if n != "" and bank.has("mus_" + n): mus.append(_loop(bank["mus_" + n][0]))


func air(n: String) -> void:
	if n == amb_name: return
	amb_name = n
	for m in amb: m.to = 0.0
	if n != "" and bank.has("amb_" + n): amb.append(_loop(bank["amb_" + n][0]))


func _loop(st) -> Dictionary:
	if st is AudioStreamOggVorbis: st.loop = true
	elif st is AudioStreamWAV: st.loop_mode = AudioStreamWAV.LOOP_FORWARD
	var p := AudioStreamPlayer.new()
	p.stream = st
	p.volume_db = -60.0
	add_child(p)
	p.play()
	return { "p": p, "to": 1.0, "k": 0.0 }


func update(dt: float, skipping: bool) -> void:
	hush = move_toward(hush, 1.0 if skipping else 0.0, dt * 4.0)
	for set_ in [[mus, mus_db], [amb, -13.0]]:
		for m in set_[0].duplicate():
			m.k = move_toward(m.k, m.to, dt * 0.55)
			(m.p as AudioStreamPlayer).volume_db = linear_to_db(maxf(0.0005, m.k * (1.0 - hush * 0.9))) + set_[1]
			if m.k <= 0.0 and m.to == 0.0:
				m.p.queue_free()
				set_[0].erase(m)


## Silence, at once.
func cut() -> void:
	for p in voices: p.stop()
	for p in v3: p.stop()
	for set_ in [mus, amb]:
		for m in set_: m.p.queue_free()
		set_.clear()
	mus_name = ""
	amb_name = ""
