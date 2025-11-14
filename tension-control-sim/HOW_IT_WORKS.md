# Tension Control Model - Detailed Explanation

## 🎯 How the Model Works

### Physical Setup

```
Time: t = 0 → 6 seconds
Timestep: dt = 0.01 s (100 Hz control loop)

[Unwind] ──zone1── [Roller] ──zone2── [Dancer] ──zone3── [Roller] ──zone4── [Rewind]
  T=25N              gradual increase...                                       T=40N
  ↑                                                                              ↑
  Servo Control                                                          Servo Control
```

---

## 📐 Mathematical Model

### Core Equation: First-Order Tension Dynamics

For each zone `i`:

```
dT_i/dt = -k_i × (T_i - T_desired_i)
```

**What this means:**
- If `T_i < T_desired` → dT/dt > 0 → Tension increases
- If `T_i > T_desired` → dT/dt < 0 → Tension decreases
- System exponentially converges to target with time constant τ = 1/k

### Discrete Time Integration (Euler Method)

```javascript
T_new = T_old + (dT/dt) × dt
T_new = T_old - k × (T_old - T_desired) × dt
```

For dt = 0.01 and k = 3~15:
- One timestep changes tension by ~3-15% of the error
- Typical settling time: 0.3-1.0 seconds

---

## 🎮 Control Strategy

### Zone Types

**Type 1: Unwind Zone (First zone)**
```javascript
T_desired = T_unwind_set = 25N  (user input)
k = 15  (strong servo control)
```
→ Tracks 25N tightly, feeds material with low tension

**Type 2: Rewind Zone (Last zone)**
```javascript
T_desired = T_rewind_set = 40N  (user input)
k = 15  (strong servo control)
```
→ Tracks 40N tightly, pulls material with high tension

**Type 3: Middle Zones (Passive zones)**
```javascript
T_desired = f(position, friction)  (calculated)
k = 3~8  (natural damping, higher if has Dancer)
```
→ Floats to equilibrium based on boundary conditions

---

## 🔢 Tension Distribution Calculation

### Step 1: Position-Based Interpolation

For zone `i` at position `progress = i / (numZones - 1)`:

```javascript
T_base[i] = T_unwind + (T_rewind - T_unwind) × progress
```

Example with 5 zones:
```
Zone 0: T_base = 25 + (40-25) × 0/4 = 25.0 N
Zone 1: T_base = 25 + (40-25) × 1/4 = 28.75 N
Zone 2: T_base = 25 + (40-25) × 2/4 = 32.5 N
Zone 3: T_base = 25 + (40-25) × 3/4 = 36.25 N
Zone 4: T_base = 25 + (40-25) × 4/4 = 40.0 N
```

### Step 2: Friction Effect

```javascript
frictionFactor[roller] = 0.02  (standard roller)
frictionFactor[dancer] = 0.01  (lower friction)

T_friction[i] = Σ(frictionFactor[0...i]) × T_base[i] × 0.1
```

**Physical meaning:** Each roller adds a small tension increment due to wrap friction.

---

## 🕐 Time Evolution Example

Let's trace Zone 2 (middle zone) over time:

**Initial State (t=0):**
```
T[zone2] = 0 N  (cold start)
T_desired[zone2] = 32.5 N  (from interpolation)
k = 3
```

**First Timestep (t=0.01s):**
```
dT/dt = -3 × (0 - 32.5) = +97.5 N/s
T_new = 0 + 97.5 × 0.01 = 0.975 N
```

**Second Timestep (t=0.02s):**
```
dT/dt = -3 × (0.975 - 32.5) = +94.575 N/s
T_new = 0.975 + 94.575 × 0.01 = 1.921 N
```

**After ~1.5 seconds (startup complete):**
```
T[zone2] ≈ 32.5 N  (settled)
dT/dt ≈ 0
```

---

## 🚀 Startup Ramp

To prevent shock loading during startup:

```javascript
speedRatio(t) = {
  t < 1.5s: t / 1.5        // Linear ramp
  t ≥ 1.5s: 1.0            // Full speed
}

T_actual = T_setpoint × speedRatio(t)
```

**Example:**
```
t = 0.0s: speedRatio = 0.0 → T_unwind = 25 × 0.0 = 0 N
t = 0.5s: speedRatio = 0.33 → T_unwind = 25 × 0.33 = 8.3 N
t = 1.0s: speedRatio = 0.67 → T_unwind = 25 × 0.67 = 16.7 N
t = 1.5s: speedRatio = 1.0 → T_unwind = 25 × 1.0 = 25 N
```

---

## 🎭 Role of Each Component

### Dancer Rollers
```javascript
if (hasDancer) {
  damping = 8.0  (vs 3.0 for normal zones)
}
```

**Effect:** 
- Higher damping → Faster settling → Less oscillation
- Acts as tension buffer/accumulator
- Critical for absorbing disturbances

### Friction Coefficient
```javascript
frictionCoeff = 0.02  (2% per roller)
```

**Effect:**
- Causes gradual tension build-up along the line
- Mimics real wrap friction (Capstan equation)
- Higher friction → Steeper tension gradient

---

## 📊 Data Flow in Simulation Loop

```
for each timestep (0.01s):
  1. Calculate current line speed
     v(t) = ramp function
  
  2. Scale all target tensions
     T_desired = T_base × speedRatio(t)
  
  3. For each zone:
     a. Determine control mode (servo vs passive)
     b. Calculate tension error
        error = T_current - T_desired
     c. Compute rate of change
        dT/dt = -k × error
     d. Update tension
        T_new = T_old + dT/dt × dt
     e. Calculate strain
        ε = T / EA
     f. Record data
        history[zone].push(T)
```

---

## 🔬 Key Parameters

| Parameter | Physical Meaning | Typical Value |
|-----------|------------------|---------------|
| `EA` | Material stiffness | 2e5 N (copper) |
| `T_unwind` | Entry tension | 25 N |
| `T_rewind` | Exit tension | 40 N |
| `k_servo` | Servo gain | 15 (fast response) |
| `k_passive` | Natural damping | 3-8 (slower) |
| `frictionCoeff` | Roller friction | 0.02 (2%) |
| `dt` | Time step | 0.01 s |

---

## 💡 Why This Model Works

### Physical Consistency

1. **Tension Balance:** 
   - Rewind > Unwind → Net pulling force → Material moves forward
   
2. **Smooth Gradient:**
   - Middle zones interpolate between boundaries
   - Friction adds realistic asymmetry
   
3. **Stability:**
   - First-order dynamics → Always converges
   - No oscillation with proper damping

### Servo Control Logic

```
Unwind (feeds):  "Maintain 25N tension while releasing material"
Rewind (pulls):  "Maintain 40N tension while taking up material"
Middle zones:    "Let tension float to equilibrium"
```

This mimics real servo systems where:
- Unwind torque decreases as roll diameter shrinks
- Rewind torque increases to maintain constant tension
- Line speed is set separately (assumed constant here)

---

## 🧪 What Happens When You Change Parameters?

### Increase T_rewind (e.g., 40N → 60N)
```
Effect: 
- Higher tension gradient across line
- More material stretch (higher strain)
- Risk: May exceed maxStrain → warning
```

### Increase Friction (e.g., 0.02 → 0.05)
```
Effect:
- Steeper tension build-up
- Last zones see much higher tension
- Mimics dirty/rough rollers
```

### Add Dancer Roller
```
Effect:
- Adjacent zones have k=8 instead of k=3
- Faster settling time (0.3s vs 0.8s)
- Less overshoot during disturbances
```

---

## 🎓 Comparison to Real Systems

**What's Simplified:**
- ❌ No speed mismatch (dv/dt = 0)
- ❌ No inertia effects
- ❌ No material viscoelasticity
- ❌ No cross-direction tension variation

**What's Realistic:**
- ✅ First-order tension dynamics
- ✅ Servo boundary conditions
- ✅ Friction-induced gradient
- ✅ Dancer damping effect
- ✅ Material stress-strain relationship

---

## 🚀 Advanced: State-Space Representation

For engineers familiar with control theory:

```
State vector: x = [T_1, T_2, ..., T_n]ᵀ

Dynamics: dx/dt = A·x + B·u

Where:
A = -diag(k_1, k_2, ..., k_n)  (diagonal damping matrix)
B = diag(k_1, k_2, ..., k_n)   (control input matrix)
u = [T_desired_1, ..., T_desired_n]ᵀ

This is a decoupled linear system → each zone evolves independently!
```

---

## 📝 Summary

The model is a **distributed first-order control system** where:

1. **Boundary zones** (Unwind/Rewind) are **hard-controlled** by servos
2. **Middle zones** are **soft-controlled** by natural damping
3. **Friction** creates a realistic tension gradient
4. **Dancers** add extra stability
5. **Time integration** shows dynamic response from cold start to steady-state

The result: A physically plausible tension distribution that responds like a real R2R line!
