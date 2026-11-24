extends Node
## The school's life: the clock and the bell, three years of pupils and their masters, each keeping the timetable in their
## own way (early, late, asleep, at the food), where they go between lessons, what they say, doors that shut for lessons,
## the boarding houses at night; and what Reiner can do in it: go to class, talk, read, sleep.

var s: Node3D                         # the story
var on := false
var held := false                     # the timetable stands still (a scene is using the place)
var people: Array = []                # { a, who, year, role, ... }
var by := {}
var pi := -1                          # the period now
var t := 0.0
var rng := RandomNumberGenerator.new()
var font: Font
var talk_lock := 0.0
var chat := {}                        # an overheard exchange
var chat_gap := 6.0
var ring_fx: Array = []
var skill := 0                        # lessons learnt
var day := 1
var lesson_done := {}
var flash := 0.0
var attending := false
var chapter := 0                      # 1: Chapter One's people are here too
var show_all := false                # dev: nobody is left out, near or far (to check the whole school at once)
var taken := {}                        # places spoken for this period

const HOUR_SECS := 80.0               # a school hour lasts this long
const PERIODS := [
	{ "h": 7.0, "id": "rise", "name": "Breakfast", "bell": "Rising Bell" },
	{ "h": 8.5, "id": "p1", "name": "First lesson", "bell": "First Bell" },
	{ "h": 10.0, "id": "b1", "name": "Morning break", "bell": "Break" },
	{ "h": 10.75, "id": "p2", "name": "Second lesson", "bell": "Second Bell" },
	{ "h": 12.0, "id": "lunch", "name": "Dinner", "bell": "Noon Bell" },
	{ "h": 13.0, "id": "p3", "name": "Third lesson", "bell": "Third Bell" },
	{ "h": 14.25, "id": "b2", "name": "Afternoon break", "bell": "Break" },
	{ "h": 15.0, "id": "p4", "name": "Fourth lesson", "bell": "Fourth Bell" },
	{ "h": 16.25, "id": "free", "name": "Free time", "bell": "Last Bell" },
	{ "h": 18.5, "id": "supper", "name": "Supper", "bell": "Supper Bell" },
	{ "h": 19.5, "id": "eve", "name": "Evening", "bell": "Evening Bell" },
	{ "h": 21.0, "id": "night", "name": "Lights out", "bell": "Night Bell" },
]
const TABLE := {
	1: { "p1": "1A", "p2": "2A", "p3": "glass", "p4": "yard" },
	2: { "p1": "2A", "p2": "2B", "p3": "3A", "p4": "library" },
	3: { "p1": "3A", "p2": "1A", "p3": "yard", "p4": "2B" },
}
const SUBJECT := { "1A": "Incantation, Lecture Hall 1A", "2A": "History, Room 2A", "2B": "Potions, Room 2B", "3A": "Astronomy, Room 3A", "glass": "Herblore, the Glasshouse", "yard": "Practice, the Yard", "library": "Study, the Library" }
const STAFF := {
	"halden": { "p1": "1A", "p2": "1A", "day": "hallL" }, "marrow": { "p1": "2A", "p2": "2A", "day": "corr2" }, "wren": { "p2": "2B", "p3": "glass", "p4": "2B", "day": "glassA" },
	"vane": { "day": "hall2" },
	"lys": { "p1": "3A", "p3": "3A", "day": "corr3" }, "corvin": { "p3": "yard", "p4": "yard", "day": "yardA" }, "sabine": { "all": "library", "day": "library" },
	"dorle": { "all": "refectory", "day": "refectory" }, "hob": { "all": "owl", "day": "owl" }, "agnes": { "all": "hare", "day": "hare" }, "brandt": { "day": "gateA" }, "aurel": { "day": "portalB" },
}
# each pupil: their year, house, how they keep time (seconds after the bell), pace, where they go when free, habits, lines
const PUPILS := {
	"wim": { "y": 1, "house": "owl", "late": 0.5, "pace": 1.5, "free": ["corrW", "library", "founderA", "owl"], "acts": ["look", "gulp", "scratch"], "lines": ["You're from a farm? So's my uncle. Was. It's a long story with a goat in it.", "I've written the timetable on my hand. And on my other hand, in case.", "Halden asks the back row last. I've counted. Sit in the back row.", "I'm always early. If I'm early, nothing can have started going wrong yet."] },
	"tobin": { "y": 1, "house": "owl", "late": 3.0, "pace": 1.55, "free": ["rimC", "yard", "lawnA", "rimC"], "acts": ["spark", "hips", "stretch"], "lines": ["My grandfather reached Beacon. Beacon! What did yours reach? The top shelf?", "I could light that candle in my sleep. I have, actually. They moved my bed.", "Don't take it to heart, Reiner. Somebody has to be last, or how would we know who's first?", "Watch. One snap. ...It's windy out here, that's all."] },
	"isolde": { "y": 1, "house": "hare", "late": 0.0, "pace": 1.6, "free": ["library", "library", "benchC", "library"], "acts": ["read"], "lines": ["You are standing in my light.", "Page two hundred and six. No, I don't need to look where I'm going, people move.", "You stress the wrong syllable. All of them, in fact.", "I'm not unfriendly. I am busy."] },
	"petra": { "y": 1, "house": "hare", "late": 16.0, "pace": 3.1, "free": ["rimD", "lawnB", "hallR", "portalA"], "acts": ["giggle", "hop", "look"], "lines": ["Late? I'm not late. The bell's early. I've complained about it.", "If anyone asks, I've been here the whole time, and I've never owned a frog.", "I like your hair. It looks like it's leaving.", "Quick, walk with me. Look innocent. More innocent. Oh, never mind."] },
	"nadi": { "y": 1, "house": "hare", "late": 4.0, "pace": 1.45, "free": ["lawnC", "rimD", "corr2b", "hare"], "acts": ["talk", "giggle", "nod"], "lines": ["They say the Headmistress hasn't slept since the Frost. They say it's why she's so good at chess.", "Maron? Nobody knows a thing about Maron. Do you know how hard that is, at this school?", "Everyone's saying you set fire to Halden's hat. I say it, mostly.", "Room 3E? The ceiling is still up there somewhere. That's the trouble."] },
	"otto": { "y": 1, "house": "owl", "late": 2.0, "pace": 1.4, "free": ["refectory", "refectory", "benchB", "refectory"], "acts": ["eat", "stretch"], "lines": ["Dorle's doing dumplings. I can tell by how the stairs smell.", "I'm here for the Kindling, they say. I'm here for the kitchen, between us.", "Your mother makes honey buns? Your actual mother? Are you free this holiday?", "Magic's hungry work. Nobody puts that in the books."] },
	"selma": { "y": 1, "house": "hare", "late": 10.0, "pace": 1.15, "free": ["treeB", "benchD", "treeB", "hare"], "acts": ["yawn", "sleep"], "lines": ["Mm? Is it still Tuesday?", "I can hear perfectly well with my eyes shut. Better, really.", "I dreamt I was awake. It was exhausting.", "If I fall asleep in Astronomy it's only research."] },
	"kas": { "y": 1, "house": "owl", "late": 6.0, "pace": 1.3, "free": ["glassA", "pondB", "glass", "pondA"], "acts": ["crouch", "look", "nod"], "lines": ["The third bed on the left likes being sung to. Low notes. Nothing sad.", "Mind the moss. It's been there longer than the wall.", "There's a newt in the pond that bows. I think it's bowing. I bow back, to be safe.", "You grew up with wheat? What's wheat like? As company, I mean."] },
	"maron": { "y": 1, "house": "hare", "late": 1.0, "pace": 1.5, "free": ["maron", "maron", "library", "maron"], "acts": ["readG"], "lines": ["Was there something you wanted, Reiner?", "I'm reading. You may sit there and be quiet, if you like.", "People look at what moves. If you ever want to know how anything is done, look at what doesn't.", "Your shoelace. No? Made you look down, though."] },
	"rowan": { "y": 2, "house": "owl", "late": 5.0, "pace": 1.5, "free": ["rimA", "lawnA", "yardA", "owl"], "acts": ["look", "stretch"], "lines": ["Second year's harder. They stop telling you which end is hot.", "First years take the outside of the stairs. I don't make the rules. I do, actually."] },
	"ilse": { "y": 2, "house": "hare", "late": 1.0, "pace": 1.5, "free": ["benchA", "library", "portalA", "hare"], "acts": ["nod", "talk"], "lines": ["You're the one from the farm. My sister says hello. She says hello to everyone.", "If you're lost, follow the crowd. If there's no crowd, you're late."] },
	"fenn": { "y": 2, "house": "owl", "late": 12.0, "pace": 2.9, "free": ["eastA", "pondB", "lawnB", "eastA"], "acts": ["look", "hop", "stretch"], "lines": ["In the Brackwood we don't have bells. We have Aunt Sorrel. She's louder.", "I heard you come round the corner from the second floor. You favour your left foot."] },
	"yve": { "y": 2, "house": "hare", "late": 2.0, "pace": 1.2, "free": ["pondA", "founderA", "benchC", "pondA"], "acts": ["look", "read"], "lines": ["On Ilvane a lesson lasts a season. Here they ring a bell and it is over. I'm not certain I learn less.", "I am thirty-one. Please don't tell Nadi, she will make a game of it."] },
	"joss": { "y": 2, "house": "owl", "late": 4.0, "pace": 1.6, "free": ["yard", "rimE", "yard", "owl"], "acts": ["spark", "stretch"], "lines": ["Corvin says aim where the target will be. The target doesn't move. I've asked him. He just nods.", "My mother's ships go as far as Sarrow. I get sick on ponds."] },
	"marta": { "y": 2, "house": "hare", "late": 3.0, "pace": 1.4, "free": ["corr2b", "glassA", "rimB", "hare"], "acts": ["talk", "giggle"], "lines": ["Wren says a potion is only soup that has been listened to.", "Never drink anything in 2B. Not even water. Especially not water."] },
	"bram": { "y": 3, "house": "owl", "late": 2.0, "pace": 1.35, "free": ["founderA", "yardA", "benchD", "owl"], "acts": ["cross", "nod"], "lines": ["In the Skarn we'd say you have a slow fire. It's a compliment. Slow fires are hard to put out.", "Duck under the arches? I've horns, not wings. Yes. I duck."] },
	"sunniva": { "y": 3, "house": "hare", "late": 1.0, "pace": 1.55, "free": ["rimB", "yard", "library", "hare"], "acts": ["cross", "look"], "lines": ["I go to the Roadwardens after this. They've an opening. They've always an opening.", "Practise when it's raining. Anyone can light a fire when it's dry."] },
	"cato": { "y": 3, "house": "owl", "late": 8.0, "pace": 1.4, "free": ["obsA", "corr3", "obsA", "owl"], "acts": ["look", "nod", "pointup"], "lines": ["There's a star that isn't on Lys's chart. I've told her. She said, 'Good.' That was all she said.", "Have you noticed the astrolabe's gone faster since spring?"] },
	"liss": { "y": 3, "house": "hare", "late": 0.0, "pace": 1.7, "free": ["library", "hallR", "eastA", "library"], "acts": ["read", "look"], "lines": ["I'm a prefect. That means I have seen you running and I'm deciding.", "No magic in the library. Sabine can smell it. So can I, but she minds."] },
	"orin": { "y": 3, "house": "owl", "late": 6.0, "pace": 1.3, "free": ["benchB", "pondA", "treeA", "owl"], "acts": ["talk", "nod"], "lines": ["I was in your year once, when your year was someone else.", "Orlind took nine years over his candle. I think about that on bad days."] },
	"bet": { "y": 1, "ch": 1, "house": "hare", "late": 7.0, "pace": 1.9, "free": ["refectory", "hallR", "refectory", "gateA"], "acts": ["dust", "look", "stretch"], "lines": ["Scholarship. It means I scrub what you eat off, and then I sit next to you.", "Never carry anything up the front stairs. The back ones creak, but nobody important uses them.", "In Sarrow you learn knots before letters. I'll show you one that only unties if you're lying.", "If the High Table wants a thing fetched, fetch it wrong. Slowly and wrong."] },
	"lucan": { "y": 3, "ch": 1, "house": "owl", "late": 1.0, "pace": 1.35, "free": ["founderA", "library", "benchC", "library"], "acts": ["nod", "read"], "lines": ["Good day, Reiner. You see, it costs nothing.", "Order is only kindness with the sentiment taken out.", "Do ask Dorn to move, if he's in your way. He will enjoy it."] },
	"dorn": { "y": 3, "ch": 1, "house": "owl", "late": 2.0, "pace": 1.4, "free": ["yard", "founderA", "yardA", "library"], "acts": ["cross", "stretch"], "lines": ["Mind yourself.", "I don't dislike you. I don't anything you.", "Lucan says be civil. This is civil."] },
	"sibyl": { "y": 3, "ch": 1, "house": "hare", "late": 1.0, "pace": 1.45, "free": ["library", "benchC", "corr3", "library"], "acts": ["read", "nod"], "lines": ["Everything is written down, you know. I should know. I write it.", "You have ink on your cuff. I'd say so to anyone. I'd note it, too.", "Wards are easy. You decide what isn't coming in. Then it doesn't."] },
	"dove": { "y": 3, "house": "hare", "late": 4.0, "pace": 1.4, "free": ["lawnC", "rimA", "corr3", "hare"], "acts": ["giggle", "talk"], "lines": ["You'll want to see the lanterns on a still night. They line up. Nobody's told them to.", "My hair was brown when I got here. Potions. Don't ask."] },
}
const STAFF_LINES := {
	"halden": ["The word is not the flame, Reiner. The word is the asking.", "Forty years I have taught this candle. It has never once been the candle's fault."],
	"marrow": ["The Frost lasted a hundred years and eleven days. People forget the eleven days. They were the worst of it.", "History is gossip with the dates put in."],
	"wren": ["Hands clean? Both sides? Then you may touch the basil.", "Plants hold no grudges. It's most of what I like about them."],
	"corvin": ["Feet first. Then breath. Then the word. Boys always start with the word.", "Fall down as much as you need to. The sand's there for it."],
	"lys": ["Come back when it is dark. I'm very little use by day.", "The moon does not shine, you know. It repeats. There is no shame in repeating."],
	"sabine": ["No spells. No food. No running. No humming.", "You may take one book. You may take it as far as that table."],
	"dorle": ["Thin as a rake! Sit, sit. There's dumplings.", "You're the farm boy. Good. You'll know what an onion's for."],
	"hob": ["Boots on the mat. Lights out at nine. Trouble on somebody else's night.", "Your bed's upstairs, first door past the landing. Wim's made it for you. I couldn't stop him."],
	"agnes": ["Boys may stand on the rug, and the rug ends there.", "Not one stair, young man."],
	"brandt": ["Through the gate, up the path, in at the big door. If you end up in the pond you've gone wrong.", "Porter here thirty years. Never let in a thing I'd have to chase out. Twice, then."],
	"vane": ["I am not here to be liked. It saves a great deal of time.", "Turn out your pockets. ...A wooden hen. I see. Carry on."],
	"aurel": ["Reiner. Yes. I signed your letter myself. I'm told that surprises you.", "I ask one thing of a pupil. That they come back in the morning."],
}
const TEACH := {
	"halden": ["An incantation is a question. Ask it as if you wish to hear the answer.", "Again. Slower. You are not chasing it.", "Who can tell me why a flame leans toward its caster?"], "marrow": ["...and so, in the sixty-first year of the Frost, the Lantern Road was lit...", "Seven crafts. Six were found. One was given back.", "Dates, pupils. Dates are the bones."],
	"wren": ["Gently, gently. It can tell.", "Now crush, don't grind. There's a difference, and it's your wrist.", "If it hums, put it down."], "lys": ["Find the Wanderer. Now find it again. It has moved while you looked.", "Draw what you see. Not what you know."], "corvin": ["Feet!", "Breathe out on the word, not before it.", "Good. Again."],
	"sabine": ["Shh.", "Page corners are not bookmarks."],
}
const CHATS := [
	["tobin", "petra", ["I'll be top by Midwinter.", "Top of what?", "The... year.", "Isolde's in the year, Tobin.", "Second, then."]],
	["nadi", "petra", ["Did you hear about Halden's hat?", "Hear? I can smell it."]],
	["nadi", "dove", ["They say there's a girl on the roofs in town at night. With an umbrella.", "In this weather?", "That's what I said!"]],
	["fenn", "rowan", ["Race you to the gate.", "You'll win.", "Yes. Race you to the gate."]],
	["rowan", "joss", ["What did you get on the star chart?", "Ink, mostly."]],
	["bram", "orin", ["Cold tonight.", "Is it?", "No. I miss saying it."]],
	["ilse", "marta", ["Wren's potion hummed.", "Did you put it down?", "I joined in."]],
	["sunniva", "liss", ["The League wants a third rank for the Frostgate road.", "Already? Nobody's been up there in forty years.", "Someone has."]],
	["wim", "otto", ["Do you think he'll test us?", "I think he'll feed us. Eventually. Somebody has to."]],
	["isolde", "wim", ["You dropped this.", "Th-thank you! You noticed!", "It was loud."]],
	["cato", "dove", ["That star's closer.", "Stars don't get closer.", "I know."]],
	["bet", "otto", ["Is that your third?", "It's my first. The other two were Wim's."]],
	["dorn", "sibyl", ["He looked at me.", "People do, Dorn. You are in front of things."]],
	["lucan", "sibyl", ["Who is last, this term?", "The farm boy.", "Still? ...How patient of him."]],
	["nadi", "bet", ["So is it true about the hats?", "Which hats?", "ANY hats!"]],
	["yve", "kas", ["The lilies are opening late this year.", "They're shy of the newt."]],
]
const BOOKS := [
	["The Seven Crafts", "Kindling for light and flame. Tides for water. Breath for wind. Stone for earth. Mending for what is hurt, and Wards for what must not be. The seventh is Calling, and the chapter on it has been neatly cut out."],
	["On Ranks", "A mage is first a Spark, if they can make one. Then Candle, if it stays. Lantern, Hearth and Beacon follow. There have been nine Stars. One may be a Hearth in Mending and no more than a Spark in Stone; most are."],
	["Of Chanting", "A beginner speaks the whole incantation. A Lantern may speak half. A Beacon moves their lips. There are said to be some who need neither word nor gesture, but it is bad manners to stare and worse to ask."],
	["A Short Account of the Frost", "For a hundred years the north of the Vale lay under ice. The first mages walked the passes hanging lanterns so that others could follow. That road is the Lantern Road. Not all of them are out."],
	["Peoples of the Vale and Beyond", "The horned folk of the Skarn, who count wealth in firewood. The Brackwood folk, sharp of ear. The lake people of Ilvane, who live long and are late for everything. The traders of Sarrow. And farmers, who feed all of them and are seldom in books."],
	["The Roadwardens' League", "Any town of size has a League house, with a board of work. Wardens are ranked by the roads they may walk alone: Lane, Highway, Pass and Wild. Mages are paid double, and buried at the League's expense."],
	["Coinage", "Ten coppers to the silver, twenty silvers to the crown. A term at the Academy is two crowns. A good cow is three. (Someone has written in the margin: 'the cow also gives milk'.)"],
	["Stage Magic and Other Frauds", "The conjuror has no mana at all. A card, a coin, a scarf, a smile; he makes you look at one hand while the other does the work. It is a low art. (In the margin, in violet ink: 'Says who?')"],
	["House Rules, Owl House", "Boots on the mat. No flames above the first stair. The owl over the door answers one question a term. Do not waste it, as I did. Signed, a former pupil."],
	["Orlind the Slow", "The founder had no gift. He was refused by four masters. He came back to each of them, in order, and asked again."],
]


func _ready() -> void:
	rng.seed = 21
	font = SystemFont.new()
	(font as SystemFont).font_names = PackedStringArray(["Georgia", "Times New Roman", "serif"])
	(font as SystemFont).font_weight = 700


func st() -> Node3D: return s.stages.get("academy")


## Fill the school with its people.
func open(hour: float) -> void:
	if people.is_empty():
		for k in PUPILS: _add(k, int(PUPILS[k].y), "pupil")
		for k in STAFF: _add(k, 0, "staff")
		var counts := { 1: 1, 2: 0, 3: 0 }                # (Reiner has the first years' seat 0 .. see seat_of)
		for p in people:
			if p.role == "pupil":
				p.n = counts[p.year]
				counts[p.year] += 1
		var beds := { "owl": 2, "hare": 0 }               # (the first owl bed is Reiner's, the next Wim's)
		for p in people:
			if p.role != "pupil": continue
			if p.who in ["lucan", "dorn", "sibyl"]: p.bed = 0                  # (they keep late hours, in the library)
			elif p.who == "wim": p.bed = 1
			else:
				p.bed = beds[p.house]
				beds[p.house] += 1
	on = true
	held = false
	taken = {}
	s.hour = hour
	s.hour_run = 1.0 / HOUR_SECS
	pi = _period_at(hour)
	for p in people:
		p.away = int(PUPILS.get(p.who, {}).get("ch", 1 if p.who == "vane" else 0)) > chapter
		if p.away:
			p.a.visible = false
			continue
		p.a.stage = st()
		if not (p.a in st().actors): st().actors.append(p.a)
		p.a.visible = true
		p.a.get_up()
		p.a.look = null
		_assign(p, true)
	_doors()


func close() -> void:
	on = false
	for p in people:
		p.a.visible = false
		if st(): st().actors.erase(p.a)


func _add(k: String, y: int, role: String) -> void:
	var a: Node3D = s.actor(k)
	var d: Dictionary = PUPILS.get(k, {})
	var p := { "a": a, "who": k, "year": y, "role": role, "house": d.get("house", ""), "n": 0, "bed": -1, "line": rng.randi() % 4, "spot": {}, "at": "", "delay": 0.0, "go": null, "arr": true, "act_t": 3.0 + rng.randf() * 6.0, "heed": 0.0, "teach": 0.0, "node": -1, "fi": 0, "hid": false, "lane": 0.22 + rng.randf() * 0.5 }
	people.append(p)
	by[k] = p


func _period_at(h: float) -> int:
	var r := PERIODS.size() - 1
	for i in PERIODS.size():
		if h >= PERIODS[i].h: r = i
	if h < PERIODS[0].h: r = PERIODS.size() - 1
	return r


func period() -> Dictionary: return PERIODS[pi] if pi >= 0 else PERIODS[0]


func seat_of(room: String, year: int, n: int) -> Dictionary:
	var r: Dictionary = st().data.rooms[room]
	var k := n
	if room == "1A": k = (n * 2 + 1) % r.seats.size()
	elif room == "refectory": k = (n + (year - 1) * 11) % r.seats.size()
	elif room in ["owl", "hare"]: k = n % r.seats.size()
	return r.seats[k % r.seats.size()]


## A seat of their own: the one they'd choose, or the next that's free. (Reiner's is kept for him.)
func _free_seat(room: String, year: int, n: int) -> Dictionary:
	var seats: Array = st().data.rooms[room].seats
	var q: Dictionary = seat_of(room, year, n)
	var i := seats.find(q)
	if year == 1 and TABLE[1].get(period().id, "") == room: taken["%s#%d" % [room, seats.find(seat_of(room, 1, 0))]] = true
	for k in seats.size():
		var j := (i + k) % seats.size()
		var key := "%s#%d" % [room, j]
		if not taken.has(key):
			taken[key] = true
			return seats[j]
	return q


## Where someone ought to be now, as { key, p, yaw, pose, h, node, via, y }.
func _want(p: Dictionary) -> Dictionary:
	var id: String = period().id
	var D: Dictionary = st().data
	if p.role == "staff":
		var f: Dictionary = STAFF[p.who]
		var rm: String = f.get("all", f.get(id, ""))
		if id == "lunch" and not f.has("all") and p.who != "brandt": rm = ""
		if rm != "":
			var R: Dictionary = D.rooms[rm]
			var yy: float = 0.0 if R.f < 0 else (0.048 if rm in ["owl", "hare"] else [0.048, 3.648, 7.248][int(R.f)])
			return { "key": rm + "T", "p": Vector3(R.teacher.x, yy, R.teacher.z), "yaw": R.teacher.yaw, "pose": "stand", "node": R.node, "via": R.teacher.get("via", []) }
		return _spot(f.day)
	if id == "night" and p.who in ["lucan", "dorn", "sibyl"]: return _seat("library", p.year, p.n, "sitread")      # (the High Table keeps no curfew)
	if id == "night":
		var b: Dictionary = D.rooms[p.house].beds[p.bed % D.rooms[p.house].beds.size()]
		return { "key": "bed", "p": Vector3(b.x, b.y, b.z), "yaw": b.yaw, "pose": "lie", "node": b.node, "via": [], "y": b.y }
	if id in ["p1", "p2", "p3", "p4"]:
		var rm: String = TABLE[p.year][id]
		return _seat(rm, p.year, p.n, "desk" if rm in ["1A", "2A", "3A"] else ("sitread" if rm == "library" else "stand"))
	if id in ["lunch", "supper"] or (id == "rise" and p.n % 3 != 1): return _seat("refectory", p.year, p.n, "eat")
	var list: Array = PUPILS[p.who].free
	var k: String = list[p.fi % list.size()]
	if id in ["b1", "b2"] and k in ["owl", "hare"]: k = list[0]
	if id == "eve": k = p.house if p.n % 3 != 2 else ("library" if p.n % 2 else p.house)
	if id in ["b1", "b2"] and p.year > 1 and p.n % 2 == 0: k = ["corr2", "corr2b", "corr3", "hall2", "hallR", "corrW"][p.n % 6]
	return _spot(k, p)


func _seat(rm: String, year: int, n: int, pose: String) -> Dictionary:
	var R: Dictionary = st().data.rooms[rm]
	var q: Dictionary = _free_seat(rm, year, n)
	var yy: float = 0.0 if R.f < 0 else (0.048 if rm in ["owl", "hare"] else [0.048, 3.648, 7.248][int(R.f)])
	var ps := pose
	if float(q.get("h", 0.0)) <= 0.0: ps = "stand"
	elif q.get("read", false) and pose == "sit": ps = "sitread" if n % 2 else "sit"
	return { "key": rm, "p": Vector3(q.x, yy, q.z), "yaw": q.yaw, "pose": ps, "h": q.get("h", 0.0), "node": R.node, "via": q.get("via", []) }


func _spot(k: String, p := {}) -> Dictionary:
	var D: Dictionary = st().data
	if D.rooms.has(k):
		if k in ["yard", "glass"]: return _seat(k, p.get("year", 1), p.get("n", 0), "stand")
		return _seat(k, p.get("year", 1), p.get("n", 0) + (6 if p.get("year", 1) == 3 else 0), "eat" if k == "refectory" else "sit")
	var q: Dictionary = D.spots[k]
	var pose := "stand"
	var at := Vector3(q.x, q.y, q.z)
	var c: int = taken.get(k, 0)
	taken[k] = c + 1
	if q.get("sit", false):                              # a bench seats two; a third stands by it
		pose = "sit"
		var al := Vector3(cos(q.yaw), 0, -sin(q.yaw))
		if c < 2: at += al * (-0.43 if c == 0 else 0.43)
		else:
			pose = "stand"
			at += al * (1.35 if c == 2 else -1.35) + Vector3(sin(q.yaw), 0, cos(q.yaw)) * 0.5
	elif q.get("ground", false):
		pose = "groundread"
		if c > 0: at += Vector3(sin(c * 2.2), 0, cos(c * 2.2)) * 1.2
	elif c > 0: at += Vector3(sin(q.yaw + c * 1.9), 0, cos(q.yaw + c * 1.9)) * 1.0
	return { "key": k, "p": at, "yaw": q.yaw, "pose": pose, "h": q.get("h", 0.5), "node": q.node, "via": [] }


func _assign(p: Dictionary, now := false) -> void:
	if p.get("away", false): return
	var w := _want(p)
	p.spot = w
	var a: Node3D = p.a
	if now:
		a.path = []
		_settle(p)
		a.position = w.p
		p.arr = true
		p.node = st().node_id.get(String(w.node), 0)
		return
	p.delay = 0.0
	if p.role == "pupil":
		var late: float = PUPILS[p.who].late
		p.delay = late * (0.6 + rng.randf() * 0.8) + rng.randf() * 9.0
	else: p.delay = rng.randf() * 2.0
	p.go = true


func _set_off(p: Dictionary) -> void:
	p.go = null
	var a: Node3D = p.a
	var w: Dictionary = p.spot
	var S: Node3D = st()
	if a.pose == "lie": a.get_up()
	a.stand()
	_put_down(p)
	var from: int = p.node if p.node >= 0 else S.nearest_node(a.position)
	var to: int = S.node_id[String(w.node)]
	var route: Array = []
	var nback: int = (p.back as Array).size() if p.has("back") else 0
	if p.has("back"):                                  # out of the row again, the way they came in
		for q in p.back: route.append({ "p": q, "door": "" })
		p.erase("back")
	var mid: Array = S.find_path(from, to) if from != to else []
	if from != to: route.append({ "p": S._np(from), "door": "" })
	route.append_array(mid)
	# keep right: each by their own little way, closer in at doors, so people going opposite ways pass, not meet
	var prev: Vector3 = a.position
	for i in route.size():
		var here: Vector3 = route[i].p
		var nxt: Vector3 = route[i + 1].p if i + 1 < route.size() else here
		var dd := (nxt - prev) if i + 1 < route.size() else (here - prev)
		prev = here
		dd.y = 0.0
		if dd.length() < 0.05 or route[i].get("warp", false): continue
		dd = dd.normalized()
		var tight: bool = String(route[i].get("door", "")) != "" or (i + 1 < route.size() and String(route[i + 1].get("door", "")) != "")
		var off: float = p.lane
		if tight:
			var dn: String = String(route[i].get("door", "")) if String(route[i].get("door", "")) != "" else String(route[i + 1].get("door", ""))
			off = 0.42 if S.doors.has(dn) and S.doors[dn].nodes.size() > 1 else 0.21
		if here.x > 150.0: off = minf(off, 0.3)
		if i <= nback and nback > 0 and not tight: off = minf(off, 0.1)            # (between the desks there's only the one way)
		route[i] = { "p": here + Vector3(-dd.z, 0, dd.x) * off, "door": route[i].get("door", ""), "warp": route[i].get("warp", false) }
	var back: Array = []
	var y: float = w.p.y
	for v in w.via:
		route.append({ "p": Vector3(v[0], y, v[1]), "door": "" })
		back.push_front(Vector3(v[0], y, v[1]))
	route.append({ "p": w.p, "door": "" })
	p.back = back
	p.node = to
	p.arr = false
	var pace: float = PUPILS[p.who].pace if p.role == "pupil" else 1.35
	a.look = null
	a.face_yaw = null
	a.go_free(route, pace * 1.12)


func _put_down(p: Dictionary) -> void:
	var n: Node3D = p.a.drop("L")
	if n: n.queue_free()
	n = p.a.drop("R")
	if n: n.queue_free()


func _settle(p: Dictionary) -> void:
	var a: Node3D = p.a
	var w: Dictionary = p.spot
	p.arr = true
	a.yaw = w.yaw if w.pose != "stand" else a.yaw
	a.face_yaw = w.yaw
	a.feel("open", "flat")
	_put_down(p)
	if w.pose == "lie":
		a.lie_at(w.p, w.yaw)
		return
	a.body.rotation = Vector3.ZERO
	a.body.position = Vector3.ZERO
	if w.pose == "stand":
		a.stand()
		if p.role == "pupil" and "cross" in PUPILS[p.who].acts: a.pose = "crossed"
	else:
		a.position = w.p
		a.yaw = w.yaw
		a.sit(float(w.get("h", 0.46)), w.pose)
	if p.role == "pupil":
		var acts: Array = PUPILS[p.who].acts
		if ("read" in acts and w.pose in ["sit", "stand"] and not (period().id in ["p1", "p2", "p3", "p4", "lunch", "supper"])):
			a.pose = "sitread" if w.pose == "sit" else "read"
		if a.pose in ["read", "sitread", "groundread"]:
			var b: Node3D = s.prop("book_open")
			a.hold("L", b, Transform3D(Basis(Vector3.RIGHT, 0.5) * Basis(Vector3.UP, PI), Vector3(-0.1, -0.02, 0.08)))
		if "sleep" in acts and w.pose == "sit": a.feel("shut", "small")
		if "sleep" in acts and w.pose == "desk" and p.n > 0: a.pose = "sleepdesk"
	if w.pose == "groundread" and p.role != "pupil": pass


# ------------------------------------------------------------------ the day --
func update(dt: float) -> void:
	t += dt
	for f in ring_fx.duplicate(): _ring_update(f, dt)
	if not on or s.place != "academy": return
	if not held:
		var i := _period_at(s.hour)
		if i != pi:
			pi = i
			_bell()
		if s.mode == "play": s.ui.clock(true, _clock(), _label_now())
	var cam: Vector3 = s.main.cam.global_position
	for p in people: _person(p, dt, cam)
	_doors()
	_chatter(dt)
	if flash > 0.0: flash = maxf(0.0, flash - dt * 0.5)
	talk_lock -= dt
	# Hare House: no further than the rug
	if s.hero and s.mode == "play" and s.hero.position.x > 150.0 and s.hero.position.z > 40.0 and (s.hero.position.x > 603.4 or s.hero.position.z < 58.0):
		s.hero.position = Vector3(600.6, 0.048, 62.2)
		s.ui.toast("Agnes: \"Not one stair, young man.\"")
	if s.mode == "play" and s.hour > 22.6 and not s.busy: sleep(true)


func _clock() -> String:
	var h := int(s.hour)
	var m := int(fmod(s.hour, 1.0) * 12.0) * 5
	return "%d:%02d" % [h, m]


func _label_now() -> String:
	var id: String = period().id
	if TABLE[1].has(id): return SUBJECT[TABLE[1][id]]
	return period().name


func _bell() -> void:
	var p: Dictionary = period()
	s.main.sfx("bell")
	st().ring_bell()
	flash = 1.0
	_ring_wave()
	var what: String = p.name
	if TABLE[1].has(p.id): what = SUBJECT[TABLE[1][p.id]]
	if s.mode == "play": s.ui.bell_text("%s  ·  %s" % [p.bell, what])
	taken = {}
	for q in people: q.fi += 1
	for q in people: if q.role == "staff": _assign(q)
	for q in people: if q.role != "staff": _assign(q)


## The bell's sound, seen: rings of pale light that open from the belfry over the roofs.
func _ring_wave() -> void:
	for k in 3:
		var m := MeshInstance3D.new()
		var tm := TorusMesh.new()
		tm.inner_radius = 0.96
		tm.outer_radius = 1.0
		tm.rings = 48
		tm.ring_segments = 4
		m.mesh = tm
		var mat := StandardMaterial3D.new()
		mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		mat.albedo_color = Color(1.0, 0.93, 0.7, 0.0)
		mat.disable_fog = true
		m.material_override = mat
		m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		st().add_child(m)
		m.position = Vector3(st().data.marks.bell[0], st().data.marks.bell[1] - 1.0, st().data.marks.bell[2])
		ring_fx.append({ "n": m, "m": mat, "t": -k * 0.55 })


func _ring_update(f: Dictionary, dt: float) -> void:
	f.t += dt
	if f.t < 0.0: return
	var u: float = f.t / 4.2
	(f.n as Node3D).scale = Vector3.ONE * (2.0 + u * 62.0)
	(f.m as StandardMaterial3D).albedo_color.a = 0.5 * (1.0 - u) * smoothstep(0.0, 0.06, u)
	if u >= 1.0:
		f.n.queue_free()
		ring_fx.erase(f)


func _zone(p: Vector3) -> int:
	if p.x > 150.0: return 2 if p.z < 30.0 else 3
	if absf(p.x) < 20.2 and p.z < -6.1 and p.z > -20.4: return 1
	return 0


func _person(p: Dictionary, dt: float, cam: Vector3) -> void:
	var a: Node3D = p.a
	if p.get("away", false):
		a.visible = false
		return
	if p.get("busy", false): return                     # a scene has them
	if p.go != null:
		p.delay -= dt
		if p.delay <= 0.0: _set_off(p)
	if not p.arr and a.path.is_empty(): _settle(p)
	# seen or not, near or far
	var ap: Vector3 = a.position
	var d := ap.distance_to(cam)
	var za := _zone(ap)
	var zc := _zone(cam)
	var show := d < 44.0
	if za != zc:
		if za >= 2 or zc >= 2: show = false
		else: show = show and d < 18.0 and (absf(ap.y - cam.y + 1.4) < 3.0 or zc == 0)
	elif za == 1: show = show and absf(ap.y + 1.3 - cam.y) < 4.6
	if show_all:
		show = true
		p.walk = p.get("walk", 0.0) + dt if not a.path.is_empty() else 0.0
		if a.path.is_empty() or a.position.distance_to(p.get("wp", Vector3.INF)) > 0.7:
			p.wp = a.position
			p.walk = 0.0
		if p.walk > 10.0:
			print("STUCK %s at %s going %s next %s" % [p.who, a.position, p.spot.key, a.path[0].p])
			p.walk = -60.0
	a.visible = show
	a.lod = 0 if d < 9.0 else 1
	if not show:
		if not a.path.is_empty(): a._move(dt)
		return
	if a.talking > 0.0: return
	if p.heed > 0.0:
		p.heed -= dt
		if p.heed <= 0.0:
			a.look = null
			a.face_yaw = p.spot.yaw if p.arr else null
	if not p.arr: return
	p.act_t -= dt
	if p.act_t > 0.0: return
	p.act_t = 4.0 + rng.randf() * 7.0
	var id: String = period().id
	var lesson: bool = id in ["p1", "p2", "p3", "p4"]
	if p.role == "staff":
		if TEACH.has(p.who) and lesson and String(p.spot.key).ends_with("T"):
			a.do(["point", "pointup", "nod", "offer2", "castdo"][rng.randi() % 5], 1.8)
			if d < 14.0 and rng.randf() < 0.6: a.say_bubble(TEACH[p.who][rng.randi() % TEACH[p.who].size()], font)
		elif rng.randf() < 0.5: a.do(["look", "nod", "stretch"][rng.randi() % 3], 1.8)
		return
	if lesson:
		if p.spot.key in ["yard", "glass", "2B"]:
			if p.spot.key == "yard":
				a.do("castdo", 1.2)
				_practice(p)
			else: a.do(["pickup", "nod", "offer2", "dust"][rng.randi() % 4], 1.5)
		elif rng.randf() < 0.35: a.do(["pointup", "yawn", "scratch", "nod", "stretch"][rng.randi() % 5], 1.6)
		return
	var acts: Array = PUPILS[p.who].acts
	match acts[rng.randi() % acts.size()]:
		"spark":
			if a.pose == "stand":
				a.do("snap", 0.9)
				s.sparkle(a.hand_pos("R") + Vector3(0, 0.15, 0), 10)
		"talk": if a.pose in ["stand", "sit"]: a.talking = 1.5
		"stretch": if a.pose == "stand" or a.pose == "sit": a.do("stretch", 1.8)
		"yawn": a.do("yawn", 2.0)
		"giggle": a.do("giggle", 1.4)
		"hop": if a.pose == "stand": a.do("hop", 0.6)
		"nod": a.do("nod", 1.0)
		"look": a.do("look", 2.4)
		"gulp": a.do("gulp", 0.8)
		"scratch": a.do("scratch", 1.2)
		"pointup": a.do("pointup", 1.6)
		"crouch":
			if a.pose == "stand": a.pose = "crouch"
			elif a.pose == "crouch": a.pose = "stand"
		"hips":
			if a.pose == "stand": a.pose = "hips"
			elif a.pose == "hips": a.pose = "stand"


func _practice(p: Dictionary) -> void:
	var a: Node3D = p.a
	var from: Vector3 = a.hand_pos("R") + Vector3(-0.5, 0.4, 0)
	var c: Color = [Color("ffb04a"), Color("7ad0ff"), Color("a0f090"), Color("f0a0e0")][p.n % 4]
	s.runes(a.position + Vector3(-0.75, 1.15, 0), -PI / 2, c, 0.9, 0.24)
	var m := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3.ONE * 0.09
	m.mesh = bm
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.albedo_color = c
	m.material_override = mat
	m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	st().add_child(m)
	await s.wait(0.55)
	var to := Vector3(-41.3, 1.06 + rng.randf_range(-0.3, 0.3), from.z + rng.randf_range(-0.5, 0.5))
	var u := 0.0
	while u < 1.0:
		u += s.dt_last * 2.2
		m.position = from.lerp(to, u) + Vector3(0, sin(u * PI) * 0.35, 0)
		m.rotation = Vector3(u * 9.0, u * 7.0, 0)
		await s.tick
	s.burst(to, c, Color.WHITE, 10, 1.4, -3.0, 0.03, 0.6)
	m.queue_free()


func _doors() -> void:
	var id: String = period().id
	for k in st().doors:
		var d: Dictionary = st().doors[k]
		if d.stay: d.want = id != "night" or k == "main"
		elif d.room != "":
			var lesson := false
			for y in TABLE:
				if TABLE[y].get(id, "") == d.room: lesson = true
			var since: float = s.hour - float(PERIODS[pi].h)
			if d.has("by_hand"): continue
			d.want = (not lesson or since < 0.28) and id != "night" and d.locked == ""
			if d.room in ["refectory", "library"]: d.want = id != "night"


func _chatter(dt: float) -> void:
	if not chat.is_empty():
		chat.t -= dt
		if chat.t > 0.0: return
		if chat.i >= chat.lines.size():
			chat = {}
			chat_gap = 7.0 + rng.randf() * 9.0
			return
		var sp: Dictionary = by[chat.a if chat.i % 2 == 0 else chat.b]
		var ot: Dictionary = by[chat.b if chat.i % 2 == 0 else chat.a]
		if sp.arr and sp.a.visible: sp.a.say_bubble(chat.lines[chat.i], font)
		sp.a.look = ot.a
		ot.a.look = sp.a
		sp.heed = 5.0
		ot.heed = 5.0
		chat.t = 2.0 + String(chat.lines[chat.i]).length() * 0.045
		chat.i += 1
		return
	chat_gap -= dt
	if chat_gap > 0.0 or held or not (period().id in ["b1", "b2", "lunch", "supper", "free", "rise", "eve"]): return
	chat_gap = 4.0
	var cam: Vector3 = s.main.cam.global_position
	var ok: Array = []
	for c in CHATS:
		var A: Dictionary = by[c[0]]
		var B: Dictionary = by[c[1]]
		if A.get("away", false) or B.get("away", false): continue
		if A.a.visible and B.a.visible and A.a.position.distance_to(B.a.position) < 7.0 and A.a.position.distance_to(cam) < 12.0 and A.heed <= 0.0 and B.heed <= 0.0: ok.append(c)
	if not ok.is_empty():
		var c: Array = ok[rng.randi() % ok.size()]
		chat = { "a": c[0], "b": c[1], "lines": c[2], "i": 0, "t": 0.0 }


# ------------------------------------------------------------ what one can do --
func find_use(hp: Vector3):
	var S := st()
	var best = null
	var bd := 1.0
	for p in people:
		if not p.a.visible or p.a.pose == "lie" or p.get("away", false): continue
		var d: float = p.a.position.distance_to(hp) / 1.55
		if d < bd and talk_lock <= 0.0:
			bd = d
			best = { "label": "Talk to " + String(s.NAMES.get(p.who, p.who)), "f": func(): talk(p) }
	if best != null: return best
	# a lesson, if it's now
	var id: String = period().id
	if TABLE[1].has(id) and not held and not lesson_done.has("%d%s" % [day, id]):
		var rm: String = TABLE[1][id]
		var q: Dictionary = seat_of(rm, 1, 0)
		var R: Dictionary = S.data.rooms[rm]
		var yy: float = 0.0 if R.f < 0 else [0.048, 3.648, 7.248][int(R.f)]
		if Vector3(q.x, yy, q.z).distance_to(hp) < 1.7:
			return { "label": "Take your place  (%s)" % SUBJECT[rm], "f": func(): attend(rm, id) }
	for sg in S.data.signs:
		if absf(sg.y - hp.y) > 1.2: continue
		if Vector2(sg.x - hp.x, sg.z - hp.z).length() < float(sg.r): return { "label": sg.label, "f": func(): sign_use(sg) }
	var d = S.near_door(hp)
	if d != null:
		if d.locked != "" and d.open < 0.1: return { "label": "Try the door", "f": func(): s.ui.toast(d.locked) }
		return { "label": "Close the door" if d.want else "Open the door", "f": func(): door_use(d) }
	return null


func door_use(d: Dictionary) -> void:
	d.want = not d.want
	d.hold = 0.0
	d.by_hand = true
	s.get_tree().create_timer(14.0).timeout.connect(func(): d.erase("by_hand"))


func talk(p: Dictionary) -> void:
	var a: Node3D = p.a
	var lines: Array = PUPILS[p.who].lines if p.role == "pupil" else STAFF_LINES[p.who]
	a.look = s.hero
	p.heed = 4.5
	talk_lock = 0.8
	if a.pose == "stand" or a.pose == "crossed" or a.pose == "hips":
		if a.path.is_empty(): a.turn_to(s.hero)
	if a.eyes == "shut": a.feel("half", "flat", 4.0)
	a.say_bubble(lines[p.line % lines.size()], font)
	s.main.sfx("voice_" + String(s.VOICE.get(p.who, "girl" if p.house == "hare" else "boy")))
	p.line += 1
	s.hero.look = a
	s.get_tree().create_timer(4.0).timeout.connect(func(): if s.hero and s.hero.look == a: s.hero.look = null)


func show_timetable() -> void:
	if s.place != "academy" or not on: return
	s.read("First Year Timetable", "7:00    Rising bell. Breakfast\n8:30    Incantation, Lecture Hall 1A  (ground floor, west)\n10:00  Break\n10:45  History, Room 2A  (first floor, west)\n12:00  Dinner, the Refectory  (ground floor, east)\n13:00  Herblore, the Glasshouse  (east lawn)\n14:15  Break\n15:00  Practice, the Yard  (west lawn)\n16:15  Free time\n18:30  Supper\n21:00  Lights out\n\nBoys board at Owl House, girls at Hare House. Anyone found in the pond after dark will be asked why.")


func sign_use(sg: Dictionary) -> void:
	match String(sg.get("id", "")):
		"timetable": show_timetable()
		"books":
			var b: Array = BOOKS[rng.randi() % BOOKS.size()]
			s.read(b[0], b[1])
		"board": s.act.ch1.read_board()
		"owl": _through("owl_door", PI)
		"owl_out": _through("dW", PI / 2)
		"hare":
			_through("hare_door", PI)
		"hare_out": _through("dE", -PI / 2)
		"sleep": sleep(false)
		_: s.read(sg.label, sg.text) if String(sg.text).length() > 60 else s.ui.toast(sg.text)


func _through(node: String, yaw: float) -> void:
	if s.busy: return
	s.locked = true
	s.main.sfx("door")
	await s.fade(1.0, 0.35)
	var S := st()
	s.hero.place(S._np(S.node_id[node]), yaw)
	s.cam_yaw = yaw + PI
	s.cam_tgt = s.hero.position + Vector3(0, 1.15, 0)
	await s.wait(0.1)
	await s.fade(0.0, 0.4)
	s.locked = false


func sleep(made: bool) -> void:
	if s.busy: return
	if s.hour > 8.0 and s.hour < 18.0 and not made:
		s.ui.toast("It's the middle of the day. Hob would have something to say.")
		return
	s.locked = true
	if made: s.ui.toast("Hob: \"Bed, lad. It'll all still be wrong in the morning.\"")
	await s.fade(1.0, 1.2)
	day += 1
	s.hour = 7.02
	pi = _period_at(s.hour)
	taken = {}
	for p in people: _assign(p, true)
	var b: Dictionary = st().data.rooms.owl.beds[0]
	s.hero.place(Vector3(b.x + 0.85, b.y, b.z + 0.2), PI / 2)
	s.cam_yaw = PI / 2 + PI
	s.cam_tgt = s.hero.position + Vector3(0, 1.15, 0)
	await s.wait(0.8)
	s.main.sfx("bell")
	s.ui.bell_text("Rising Bell  ·  Day %d" % day)
	await s.fade(0.0, 1.2)
	s.locked = false


# ---------------------------------------------------------------- a lesson --
const LESSON := {
	"1A": { "who": "halden", "a": ["Again, the candle. Whole incantation, if you please. Nobody is grading speed.", "Reiner. When you are ready. Or a little before."], "words": [["Wake", "U"], ["small", "L"], ["one", "R"], ["and", "D"], ["see", "U"]], "good": "Hm. It leaned toward you. That is a beginning.", "bad": "It smoked. Last week it exploded. I shall call that progress." },
	"2A": { "who": "marrow", "a": ["Recite with me the Lantern Roll. The first seven, in the order they were lit."], "words": [["Hollin", "L"], ["Marsh", "D"], ["Two", "U"], ["Stones", "U"], ["Arrel", "R"], ["Ford", "D"]], "good": "Every one. I only had to wake up twice.", "bad": "You have moved the Lantern Road into the sea." },
	"glass": { "who": "wren", "a": ["Hum to your seedling, low and even. It wants a tune it can lean on."], "words": [["Hmm", "D"], ["hm", "D"], ["hmm", "L"], ["hm", "R"], ["hmm", "U"]], "good": "Look at that! It's put out a leaf just to hear you better.", "bad": "Well. It hasn't bitten you." },
	"yard": { "who": "corvin", "a": ["Feet. Breath. Word. Hit the straw, not the sky."], "words": [["Feet", "D"], ["breath", "U"], ["and", "L"], ["go", "R"]], "good": "Straw! Good lad. Again tomorrow, and the day after.", "bad": "The sky had that coming, I suppose. Again tomorrow." },
}


func attend(rm: String, id: String) -> void:
	if s.busy: return
	s.busy = true
	lesson_done["%d%s" % [day, id]] = true
	var L: Dictionary = LESSON[rm]
	var q: Dictionary = seat_of(rm, 1, 0)
	var R: Dictionary = st().data.rooms[rm]
	var yy: float = 0.0 if R.f < 0 else [0.048, 3.648, 7.248][int(R.f)]
	s.locked = true
	s.ui.prompt("")
	await s.fade(1.0, 0.4)
	var run: float = s.hour_run
	s.hour_run = 0.0
	taken = {}
	for p in people:
		if p.role == "pupil" and p.year == 1: _assign(p, true)
		elif p.who == L.who: _assign(p, true)
	var h: Node3D = s.hero
	h.place(Vector3(q.x, yy, q.z), q.yaw)
	if float(q.get("h", 0.0)) > 0.0: h.sit(q.h, "desk")
	var T: Node3D = s.actor(L.who)
	h.look = T
	s.mode = "film"
	s.ui.bars_to = 1.0
	s.ui.clock(false)
	var f := Vector3(sin(h.yaw), 0, cos(h.yaw))
	s.cut(h.position - f * 1.9 + Vector3(f.z * 0.8, 1.75, -f.x * 0.8), T.head_pos(), 44)
	await s.fade(0.0, 0.5)
	for l in L.a: await s.say(L.who, l, { "do": "point", "d": 1.8 })
	if float(q.get("h", 0.0)) > 0.0: h.stand()
	h.look = null
	h.pose = "cast"
	s.face(h, 0.6, 2.0, 40)
	var r: float = await s.cast(L.words, { "gap": 0.8, "wide": 0.22 + minf(0.1, skill * 0.01), "name": SUBJECT[rm] })
	h.do("castdo", 1.1)
	await s.wait(0.55)
	var hp: Vector3 = h.hand_pos("R") + f * 0.25
	if r >= 0.75:
		s.sparkle(hp, 22)
		s.main.sfx("spark")
		h.feel("wide", "smile", 3.0)
		skill += 1
	else:
		s.smoke(hp, 12)
		s.main.sfx("poof")
		h.do("cough", 1.4)
		h.feel("squeeze", "wavy", 2.0)
	await s.wait(0.9)
	s.over(h, T, 1.0, 36)
	await s.say(L.who, L.good if r >= 0.75 else L.bad, { "do": "nod" })
	await s.fade(1.0, 0.6)
	s.hour = float(PERIODS[mini(pi + 1, PERIODS.size() - 1)].h) - 0.06
	h.stand()
	var v: Array = q.get("via", [])
	if not v.is_empty(): h.place(Vector3(v[v.size() - 1][0], yy, v[v.size() - 1][1]), q.yaw)
	s.hour_run = run
	s.play()
	s.busy = false
	await s.fade(0.0, 0.6)
	if r >= 0.75: s.ui.toast("Reiner learned something. (%d)" % skill)
