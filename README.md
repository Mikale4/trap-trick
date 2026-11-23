# Trap Trick

A fully jointed voxel model of **Trap Trick** (stage name), playable in an open garden plaza. Her look follows the
two character sheets in `reference/`: a magenta curly-haired performer in a black top hat (heart card in the band, a big
blue bow, a dangling card charm), a flat-faced head with a V chin, a navy puff-sleeved bodice with a jabot and a gem
bow tie, a black corset with pink buttons, a navy waist bow with a red gem and ribbons, a poofy tiered skirt (periwinkle
pleats, a band of playing cards, then blue, white, navy and lilac ruffles), a big back bow whose tails end in cards,
mismatched stockings (dark argyle on her right, white harlequin lattice on her left), blue ankle bows and black platform
Mary Janes. She carries a **playing-card umbrella**.

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
| `G` | sit on a crate (the four single crates around the plaza) / stand up |
| `3`–`7` | expression: smug, smile, happy, pout, surprised |
| `J` | skeleton view (see-through body, bones and joints) |
| `H` | hide the controls |

A gamepad works too: left stick moves, right stick turns the camera, A jumps (hold to float), B runs, X trick,
Y open/close, LB umbrella, LT tilt, RT carry, d-pad emotes, R3 sit, Start help.

With nothing pressed for a while she fidgets: looks around, fixes her hat, rocks on her heels, or idly
twirls the open umbrella. She blinks.

## The desktop version (Godot)

`godot/` is the same game as a desktop project for **Godot 4.7.2** (the standard build, not .NET). Same model, plaza,
controls and gamepad mapping as above, plus **`L`**, which switches the lighting between **Rich** and **Simple** (the
web look; the HUD's Light slot shows which). Rich adds ambient occlusion, sun shadows that soften with distance, a
sky-tinted fill light, a glow on the gems and lamp heads, and haze toward the hills. On an integrated GPU it costs about
a third of the frame rate.

- **Play:** double-click **`godot/Play Trap Trick.bat`**. **Edit:** **`godot/Open in Godot editor.bat`**. Both expect
  Godot at `C:\Games\Godot\Godot_v4.7.2-stable_win64.exe`; change the path in the `.bat` if yours lives elsewhere, or
  open `godot/project.godot` from Godot's project manager.
- **Assets** (`godot/assets/`) are baked from the web version's builders, so the two never drift apart: her rig with
  every face and hand variant (`trap_trick.glb`), the umbrella (`umbrella.glb`), the puff cards (`cards.glb`), the
  plaza (`world.glb`, `ground.png`) and the joint, pivot, spring and collider data (`bake.json`). After changing anything
  in `js/`, re-bake with `node tools/bake_godot.js`.
- **Scripts:** `godot/scripts/main.gd` (scene, lighting, camera, input, HUD), `trap_trick.gd` (the character: the same
  movement, gait, IK, actions and springs as `js/anim.js`) and `fx.gd` (card puffs, dust, the card fan).
- **Testing from the command line:** `Godot --path godot -- --shot=out.png --walk --do=umbrella,open,wave --at=120`
  saves a screenshot after a scripted run (`--run`, `--cam=yaw,pitch,dist` too) and prints the frame rate. `--simple`
  starts in simple lighting; `--no=ssao,soft,sky,glow,haze` leaves single rich-lighting features out.

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
| `js/world.js` | the garden plaza, castle, trees, crates, giant cards |
| `js/fx.js` | card puffs, dust, the card fan |
| `js/main.js` | renderer, camera, input, HUD |
| `tools/serve.py` | the local server (caching off) |
| `tools/bake_godot.js` | bakes the model, umbrella, cards and plaza into `godot/assets/` for the desktop version |
| `godot/` | the Godot desktop version |

Kept on the local machine only (not in the repository): `reference/` (the character sheets), `tools/viewer.html`
(a model viewer: `?views=front,side,back&face=happy&item=umbrella&open=1`) and `tools/sheet.js` (renders a strip of
frames into one image from the console).
