# Trap Trick

A fully jointed voxel model of **Trap Trick** (stage name), playable in **the Wonder Garden**. Her look follows the
character sheets in `reference/`: a performer with a big mane of bright pink curls in a black top hat (heart card in the band, a big
blue bow, a dangling card charm), a flat-faced head with a V chin, a navy puff-sleeved bodice with a jabot and a gem
bow tie, a black corset with pink buttons, a navy waist bow with a red gem and ribbons, a poofy tiered skirt (periwinkle
pleats, a band of playing cards, then blue, white, navy and lilac ruffles), a big back bow whose tails end in cards,
mismatched stockings (dark argyle on her right, white harlequin lattice on her left), blue ankle bows and black platform
Mary Janes. She carries a **playing-card umbrella**.

## The story (desktop version)

The story is about **Reiner**, a farm boy accepted at the Mage Academy without a spark of talent. A classmate, **Maron**,
ends up tutoring him. He doesn't know who she is after school.

- **The Opening Act** (about 15 minutes, twelve parts): dawn at the farm, chores (played), the letter, leaving home,
  Thistlewick (played), the Academy, Owl House (played), the candle lesson, a few bad weeks, the bargain, the first
  lesson, the night. Hold `Tab` to skip a scene. Any part can be started from *Chapters*.
- **Chapter One, "The Lantern Board"** (about 25 minutes, fourteen parts): the pupils are ranked on a wall of lanterns, and
  Reiner's is last and unlit. The High Table (Lucan, Dorn and Sibyl) set errands on those below them; Bet, Wim, Kas and
  others stand by him; Proctor Vane has come to catch whoever is putting hats on things at night. Played: a day of fetches,
  candle duels ("wicks"), and one night's mischief as Trap Trick, keeping out of the Proctor's lantern.
- **Chapter Two, "What Chooses You"** (about 25 minutes, fourteen parts): the wandwright tips out her tub, and a wand chooses
  its mage. One that has found its mage **turns into what they are**, underneath: Petra's is fire, Kas's a living branch,
  Wim's a cat, Bet's her mother's ladle. Every one of them rolls away from Reiner. Two second years, Cassian and Odile, run
  a book on the day he'll go home. One night somebody crosses the roofs, and something falls: not a wand but a
  baton, which when Reiner touches it becomes a dark staff a little taller than he is. Played: sneaking up on a garden of
  wands, and being chased by one. After the end card, his candle.
- **Chapter Three, "What Is Kept"** (about 25 minutes, twelve parts): a long way north, in the Drowse, mountains said to be a
  dragon asleep, Penny leads four tourists up by the flags into a storm, a cave, and what's under it; somebody who can't
  remember his name gets them out, and she gives him one. Then the Academy: Reiner's baton (some call it pity), and two weeks
  of learning that a wand awake drains its mage, so it must be put away again. And a note where nobody could have left one;
  Maron doesn't go and look. Her cat does. Played: Penny's walk, the gusts, making camp; lighting candles and paper birds,
  the Long Dark; the cat, by scent, through the school at night.
- **Free afternoons:** four of them in Chapter Two, two meetings each. Whoever you choose to see (friends, the old High
  Table, the Proctor, Maron) has a story of their own, with something for you to say. How well you know them changes who
  stands by Reiner later, who comes to his door, how he gets out, and what he sees. `J` shows everyone, and where they are.
- **Wicks:** candle duels on the incantation ring. Blue shelters your flame from a breath, gold calls it higher, rose
  breathes on theirs.
- **Mana (Chapter Three):** hold `F` to wake the staff, let go to put it away. Awake, it spends you; with none left, down you go.
- **Incantations:** syllables drift to a ring; press each one's direction (`W A S D` or the arrows) as it gets there.
- **School Days:** the whole campus, free to roam: a school of three floors (stairs, doors that open and shut), the
  glasshouse, the practice yard, the court, two boarding houses with a warden, common room and bedrooms each. Three years
  of pupils and their masters keep a timetable by a clock and a bell whose ring can be seen. Go to class, talk, read,
  sleep. `E` uses things, `T` shows the timetable, `J` the people you know, `Esc` pauses.

| Keys (story) | |
|---|---|
| `W A S D`, `Shift`, `Space` | walk, run, hop |
| `E` | talk, open, sit, read, go on |
| `F` (hold) | wake the staff; as the cat, follow the scent (Chapter Three) |
| `T` | the timetable (at the Academy) |
| `Tab` (hold) | skip a scene |
| `Esc` | pause |

A gamepad works too: left stick, `B` to run, `A` to hop or go on, `X` to use, right shoulder for `F`, `Y` the timetable, Start to pause.

How it's made: `js/cast.js` (the cast, with faces that change, hands, feet), `js/farm.js`, `js/academy.js`,
`js/snow.js` (the places, their floors, doors, seats and paths), `js/stage.js` (the kit for places), all baked by `node tools/bake_godot.js story`.
In Godot: `story.gd` (places, camera, speech, the hour, the player), `act1.gd` (the Opening Act, scene by scene),
`ch1.gd` (Chapter One), `ch2.gd` (Chapter Two: wands and their physics, the forms they take, the afternoons,
the staff, the candle), `ch3.gd` (Chapter Three: weather, mana, the cat), `fountain.gd` (falling water),
`actor.gd` (one of the cast: springs, IK, gestures, faces), `campus.gd` (the school's life), `stage.gd` (a place: floors,
stairs, doors, paths), `ui.gd`, `sound.gd`. Sound and music are synthesised by `tools/make_audio.py`.

Testing it: `--scene=0` to `--scene=51` starts at a part (Chapter One is 12 to 25, Chapter Two 26 to 39, Chapter Three 40 to 51; `--pick=n` makes the
nth choice by itself, 9 sees everyone; `--bond=wim:3,wim1:0` sets how well someone's known and what's been seen), `--scene=school16.4` the school at that hour, `--auto` plays on by
itself and reports anyone standing closer than 40 cm to someone else, `--film=dir,every,count,from` saves stills,
`--tour=x,y,z,tx,ty,tz;...` stills from given views, `--scene=simday` a whole school day, `--scene=keys` the played parts with real key presses (`--bond=farm:0`, `town`, `free`, `cam`,
`pen`, `lamp`, `bird`, `dark`, `cat`; it writes the save), `--scene=test` the basics,
`--free` starts roaming as Trap Trick.

## The town (desktop version)

The world is an old, quiet fantasy one: villages and market towns, roads between them, understated magic. The desktop
game starts in **Thistlewick**, a small half-timbered market town round a cobbled square: a fountain with a little
statue, market stalls under striped awnings (fruit, fish, cloth, flowers, bread), an inn, a bakery, a blacksmith's open
forge, a general store, a tailor's, bunting across the square, a street south to the town gate (a hay cart stands in
it) and one east. A ring of **walls** eighteen metres high, with square towers, stands round it all; there's a gatehouse in the south
of it and another in the east, where the road goes out and up to the Mage Academy on its hill. The windmill, the fields and
far mountains are beyond.

About twenty townsfolk go about their day:
- **at work:** the baker kneads, the smith hammers (sparks fly), the woodcutter splits logs (chips fly), the bard
  plays his lute, the innkeeper sweeps, the mage reads, the old man on the bench feeds the birds
- **selling:** the sellers call out their wares
- **on the move:** shoppers go stall to stall and stop to look; the guards walk their rounds; children chase round
  the fountain; the bakery boy carries trays; a woman carries water from the well; a farmer brings flour
- **and more:** chickens peck about the south street and scatter when she comes near

The townsfolk mind their own business. **`G`** near one of them gets a word and, for a moment, their attention.

Off the square on the west there is a **dark alley** under a room built across it, laundry overhead. At its end lies
**a door in the ground**, a little pink light slipping through its cracks, a black cat watching. **`G`** there opens it:
she drops through, and the summoning circle brings her into **the Wonder Garden**. Standing in the circle, **`G`** takes
her back to the alley.

## The Wonder Garden

Her own little dimension, which only she can reach (for now). The game's world is older fantasy, quiet villages and
old roads; the Wonder Garden is hers alone: a round rose courtyard at twilight, closed by a wrought-iron fence of card
suits, the lamps lit. In the middle is her stage, a paved round with a red heart inside the summoning circle (where one arrives in her
world: two rings of glowing runes and suits turning opposite ways; in the desktop version it pulses, sparkles, streaks of
light and little cards rise from it, it brightens when she stands in it, and it flares as she is summoned in at the
start), ringed by a bed of
red, white, half-painted and blue roses. Through the gate a path runs to the Heart Castle and its clock tower, a great
moon rising beside it. Outside the fence are a teacup glasshouse glowing amber, a brick tower roofed with a giant top
hat, toadstools, twisted trees hung with lanterns, topiary suits and giant playing cards, some standing in the lawn and
some floating in the air. A hedge runs round the edge of her world. In the desktop version rose petals drift down and
little lights rise.

## Play

**In the browser:** https://mikale4.github.io/trap-trick/

**Locally:** double-click **`Play Trap Trick.bat`** (it starts a small local server and opens `http://127.0.0.1:8790/`), or run
`python tools/serve.py` and open that address. Keep the server window open while playing.

| Keys | |
|---|---|
| `W A S D` / arrows | walk (relative to the camera) |
| `Shift` | run |
| `Space` | jump. With the umbrella **open**, hold `Space` while falling to float down |
| mouse drag · wheel | turn the camera · zoom |
| `1` | umbrella out / away (it appears and vanishes in a puff of cards) |
| `F` | open / close the umbrella (takes it out if needed) |
| `R` | tilt the open umbrella: over the shoulder → overhead → in front |
| `Q` | carry / hold: shoulders the umbrella, or takes it back in hand |
| `E` | trick: umbrella twirl (open) · en-garde with the closed umbrella · card fan (empty hands) |
| `Z X C V B T` | wave · point · curtsy · spin · peace-sign pose · hat tip |
| `G` | sit / stand up (toadstools; in the town, a bench) · talk to someone near · open the door in the alley · on the circle, back to the town (desktop) |
| `3`–`7` | expression: smug, smile, happy, pout, surprised |
| `J` | skeleton view (see-through body, bones and joints) |
| `H` | hide the controls |

A gamepad works too: left stick moves, right stick turns the camera, A jumps (hold to float), B runs, X trick,
Y open/close, LB umbrella, LT tilt, RT carry, d-pad emotes, R3 sit, Start help.

With nothing pressed for a while she fidgets: looks around, fixes her hat, rocks on her heels, or idly
twirls the open umbrella. She blinks.

## The desktop version (Godot)

`godot/` is the same game as a desktop project for **Godot 4.7.2** (the standard build, not .NET). Same model, garden,
controls and gamepad mapping as above, plus **`L`**, which switches the lighting between **Rich** and **Simple** (the
web look; the HUD's Light slot shows which). There **`T`** alternates the hat tip with a bow: she lifts her hat off,
sweeps it out low, crown down, and bows with her other hand on her heart, then puts it back on. **`2`** takes the hat
off for good (in a puff of cards) or puts it back on; with it off, the full crown of her hair shows (sheet 4), and `T`
is a bow with one arm swept out. Rich adds ambient occlusion, sun shadows that soften with distance (in the garden), a
sky-tinted fill light, a glow on the lamp heads, and haze toward the hills. It's the costlier mode: on an
integrated Intel UHD at 1280×720 Rich runs about 75 fps and Simple about 130. (Edges are smoothed with SMAA rather than
MSAA, and the sun's shadow map is 2048 px: on integrated graphics each of those roughly halved the frame rate.)

- **Play:** double-click **`godot/Play Trap Trick.bat`**. **Edit:** **`godot/Open in Godot editor.bat`**. Both expect
  Godot at `C:\Games\Godot\Godot_v4.7.2-stable_win64.exe`; change the path in the `.bat` if yours lives elsewhere, or
  open `godot/project.godot` from Godot's project manager.
- **Assets** (`godot/assets/`) are baked from the web version's builders, so the two never drift apart: her rig with
  every face and hand variant (`trap_trick.glb`), the umbrella (`umbrella.glb`), the puff cards (`cards.glb`), the
  garden (`world.glb`, `ground.png`) and the joint, pivot, spring and collider data (`bake.json`). After changing anything
  in `js/`, re-bake with `node tools/bake_godot.js`.
- **Scripts:** `godot/scripts/main.gd` (scene, lighting, camera, input, HUD), `trap_trick.gd` (the character: the same
  movement, gait, IK, actions and springs as `js/anim.js`) and `fx.gd` (card puffs, dust, the card fan).
- **Testing from the command line:** `Godot --path godot -- --shot=out.png --walk --do=umbrella,open,wave --at=120`
  saves a screenshot after a scripted run (`--run`, `--cam=yaw,pitch,dist` too) and prints the frame rate, triangles
  and draw calls. `--simple`
  starts in simple lighting; `--no=ssao,soft,sky,glow,haze` leaves single rich-lighting features out.

## The skeleton

The model is painted in one shared space (1 voxel = 2.4 cm; she stands 69 voxels, 1.65 m, 80 with the hat) and split
into parts at their joints. Every name below is a joint the animation turns.

```
hips (root)
├─ spine ─ chest ─ neck ─ head ─ hat ─ hatCharm (card on a chain)
│                         head ─ lockL1 ─ lockL2, lockR1 ─ lockR2        (front ringlets)
│                         head ─ back0a..back4a ─ back0b..back4b          (five back locks, two segments each)
│                         head ─ crown                                    (the top of her hair: shown with the hat off)
│          chest ─ uArmL ─ fArmL ─ handL      (shoulder, elbow, wrist)
│          chest ─ uArmR ─ fArmR ─ handR
├─ thighL ─ shinL ─ footL                      (hip, knee, ankle)
├─ thighR ─ shinR ─ footR
├─ skirt0..skirt11                             (12 panels hinged at the waist; they flare)
│    skirt3 ─ cardL, skirt9 ─ cardR            (cards hanging from the hem)
└─ bow ─ tailL1 ─ tailL2, tailR1 ─ tailR2      (the back bow; tails end in cards)
```

Faces (smug, smile, happy, pout, surprised, wink, blink) and hand shapes (relax, grip, point, peace, open) are swappable
meshes on the head and hands.

The **umbrella** is its own rig: a grip, a canopy that spins about the shaft, eight deep navy and indigo panels (each
on a hinge at the top of the shaft that folds it down and narrows it when closing), a pink-and-white frilled rim, and a
big four-loop bow on top that folds away when it closes. It is built around its grip point: in hand it rides a socket in
the fist, and the arm reaches for it with two-bone IK (shoulder, elbow, wrist), so a pose only has to say where the fist
goes and which way the umbrella points.

**The cards.** Everywhere a playing card appears (the skirt's card band, the hanging and bow-tail cards, the hat cards,
the umbrella's panels, the magic-puff cards, the giant cards in the garden) its face is painted finely on the voxel
faces, three to five squares per voxel, from true suit outlines: round-lobed hearts with a point, spades and clubs with a
thin stem on a flared foot, three-leaf clubs, clean diamonds, on rounded-corner cards with small corner suits and, on
the bigger cards, the rank. The shapes stay voxel; only the paint is finer (`tex` in `js/voxel.js`, `cardFace` in
`js/trap-trick.js`).

## How the animation works (`js/anim.js`)

- **Movement**: speed eases toward the input, she turns toward where she's heading (slowing for a sharp reversal), leans
  into turns and looks ahead with her head. Jump, landing squash, and the umbrella float.
- **Gait**: walk and run share one phase, advanced by distance travelled, and blend by speed (stance/swing, knee bend,
  heel-strike and toe-off at the ankle, pelvis twist with the chest countering, arm swing with bent elbows in the run).
  Turning on the spot takes small steps. The hips drop each frame so the lower foot stays on the ground.
- **Layers**: idle (breathing, weight shift, a head tilt) → gait → air / landing / sitting → held items (IK) → actions,
  each faded in and out, then every joint eases toward its target.
- **Secondary motion**: springs for the hair locks, bow tails and dangling cards (gravity, inertia, drag); the skirt
  panels flare from the knees under them, a spin, a fall and sway.

## Files

| | |
|---|---|
| `index.html`, `css/style.css` | the page and HUD |
| `js/voxel.js` | the voxel kit: grid, AO mesher (with fine face paint), jointed model builder |
| `js/trap-trick.js` | her model, part by part |
| `js/props.js` | the umbrella, and the little cards of her magic puffs |
| `js/anim.js` | the character: movement, poses, IK, actions, springs, skeleton view |
| `js/world.js` | the Wonder Garden: courtyard, fence and gate, lamps, roses, toadstools, the castle, moon, glasshouse, hat tower, trees, cards |
| `js/fx.js` | card puffs, dust, the card fan |
| `js/main.js` | renderer, camera, input, HUD |
| `tools/serve.py` | the local server (caching off) |
| `tools/bake_godot.js` | bakes the model, umbrella, cards, garden, town and townsfolk into `godot/assets/` for the desktop version |
| `js/town.js` | the town (desktop version; buildings in 4.8 cm voxels): houses, the square, stalls, the alley and its door, the country round, and the townsfolk's jobs, ways and lines |
| `js/things.js` | the town's small things at her own 2.4 cm voxel: food and goods, stalls, benches, barrels, the well, the fountain, the forge, signs, the cat and the hens |
| `js/people.js` | the townsfolk's voxel rigs, built from a short description each, in her own voxel style and scale (2.4 cm voxels; women about her height, men a little taller) |
| `js/cast.js`, `js/stage.js`, `js/farm.js`, `js/academy.js`, `js/snow.js` | the story's cast and places (desktop version) |
| `tools/make_audio.py` | makes the story's sound and music |
| `godot/` | the Godot desktop version (`scripts/town.gd`: the town and its people) |

Kept on the local machine only (not in the repository): `reference/` (the character sheets), `tools/viewer.html`
(a model viewer: `?views=front,side,back&face=happy&item=umbrella&open=1`) and `tools/sheet.js` (renders a strip of
frames into one image from the console).
