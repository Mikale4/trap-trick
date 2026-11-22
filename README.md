# Trap Trick

A fully jointed voxel model of **Trap Trick** (stage name), playable in an open garden plaza. Her look follows the
two character sheets in `reference/`: a magenta curly-haired performer in a black top hat (heart card in the band, a big
blue bow, a dangling card charm), a navy puff-sleeved bodice with a jabot and a gem bow tie, a black corset with pink
buttons, a poofy tiered skirt with a playing-card band (hearts, spades, diamonds, clubs) over blue, white, navy and
lilac ruffles, a big back bow whose tails end in cards, mismatched stockings (dark argyle on her right, white
harlequin lattice on her left), blue ankle bows and black platform Mary Janes. She carries a **playing-card umbrella**
and a **playing-card cane**.

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
| `2` | cane out / away |
| `Q` | carry / hold: shoulders whatever she holds, or takes it back in hand |
| `E` | trick: cane twirl and taps with a hat tip · umbrella twirl · en-garde with the closed umbrella · card fan (empty hands) |
| `Z X C V B T` | wave · point · curtsy · spin · peace-sign pose · hat tip |
| `G` | sit on a crate (the four single crates around the plaza) / stand up |
| `3`–`7` | expression: smug, smile, happy, pout, surprised |
| `J` | skeleton view (see-through body, bones and joints) |
| `H` | hide the controls |

A gamepad works too: left stick moves, right stick turns the camera, A jumps (hold to float), B runs, X trick,
Y open/close, LB umbrella, RB cane, LT tilt, RT carry, d-pad emotes, R3 sit, Start help.

With nothing pressed for a while she fidgets: looks around, fixes her hat, rocks on her heels, leans on the cane, or
idly twirls the open umbrella. She blinks.

## The skeleton

The model is painted in one shared space (1 voxel = 2.4 cm; she stands 69 voxels, 1.65 m, 80 with the hat) and split
into parts at their joints. Every name below is a joint the animation turns.

```
hips (root)
├─ spine ─ chest ─ neck ─ head ─ hat ─ hatCharm (card on a chain)
│                         head ─ lockL1 ─ lockL2, lockR1 ─ lockR2        (front ringlets)
│                         head ─ back0a..back4a ─ back0b..back4b          (five back locks, two segments each)
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

The **umbrella** is its own rig: a grip, a canopy that spins about the shaft, and eight canopy panels, each on a hinge at
the top of the shaft that folds it down and narrows it when closing. The **cane** is a rigid card-tile crook and shaft
with a swinging card charm. Both are built around the grip point; a held item rides a socket in the fist, and the arm
reaches for it with two-bone IK (shoulder, elbow, wrist), so a pose only has to say where the fist goes and which way
the item points.

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
| `js/voxel.js` | the voxel kit: grid, AO mesher, jointed model builder |
| `js/trap-trick.js` | her model, part by part |
| `js/props.js` | the umbrella and the cane |
| `js/anim.js` | the character: movement, poses, IK, actions, springs, skeleton view |
| `js/world.js` | the garden plaza, castle, trees, crates, giant cards |
| `js/fx.js` | card puffs, dust, the card fan |
| `js/main.js` | renderer, camera, input, HUD |
| `tools/serve.py` | the local server (caching off) |

Kept on the local machine only (not in the repository): `reference/` (the character sheets), `tools/viewer.html`
(a model viewer: `?views=front,side,back&face=happy&item=umbrella&open=1`) and `tools/sheet.js` (renders a strip of
frames into one image from the console).
