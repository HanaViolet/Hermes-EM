# Limezu Asset Animations

## CEO Brief

The office UI uses Limezu Modern Interiors assets but nothing is animated. Limezu sprite sheets support animation — objects like computer screens, coffee machines, fans, fish tanks, and plants have multiple animation frames as sequential numbered singles.

Currently the tileset-loader loads each Limezu single as a static sprite. We need to:
1. Investigate which Limezu singles have animation frames (sequential numbered sprites for the same object)
2. Build a furniture animation system that cycles through frames for animated objects
3. Apply animations to relevant furniture items in the office scene

The character animation system already works well (walk, typing, reading, idle). This directive extends animation to the furniture/environment layer.

## Constraints
- Must use existing `identity.time` animation clock (no separate timers)
- Must maintain z-sorting and rendering pipeline compatibility
- Performance-conscious — cache animated frames like character sprites
