# 2D Square Collision Simulation with Rotation

A physics simulation demonstrating elastic collisions between squares with realistic rotational dynamics. This project visualizes the principles of conservation of momentum, angular momentum, and energy in a 2D environment.

![image](https://github.com/user-attachments/assets/5e41962f-ca1d-4eb2-b985-614f51148a27)


## Features

- Real-time collision detection and response
- Rotational physics with angular momentum
- Adjustable mass and velocity parameters
- Optional wall friction simulation
- Variable simulation speed
- Live velocity and angular velocity display

## Demo

![collision-demo](https://github.com/user-attachments/assets/2bfe347e-8839-4818-b0b0-9c5cd243ff67)

## Physics Concepts
**Linear Momentum Conservation**

The simulation conserves linear momentum using the principle: total momentum before = total momentum after
For two colliding squares A and B:
```js
m₁v₁ + m₂v₂ = m₁v₁′ + m₂v₂′
```

In the code, this is implemented through impulse-based collision:
```js
const impulseScalar = (-(1 + e) * velAlongNormal) / (1/squareA.mass + 1/squareB.mass);
```
Where e = 1 (elastic)


Velocity changes are inversely proportional to mass:
```js
Δv₁ = -impulse * normal / m₁
Δv₂ = impulse * normal / m₂
```


**Angular Momentum Conservation**

Angular momentum = moment of inertia × angular velocity
For squares: I = (1/6) * mass * size²
During collisions, torque is applied based on:

Collision point relative to center of mass (r vectors)
Impulse forces acting perpendicular to these r vectors


The code calculates torque impulses:
```js
const torqueImpulseA = (rAx * (-impulseScalar * ny) - rAy * (-impulseScalar * nx));
```
Angular velocity change = torqueImpulse / moment of inertia


Friction at contact points converts some linear momentum to angular momentum

**Wall Friction Effects**

- Without friction:
```js
frictionedWalls = false
```
Nearly perfect restitution: `restitutionCoeff = 0.9999`
Minimal angular damping: `angularVelocity *= 0.999999`
Linear velocities reverse with nearly no energy loss
Angular velocity barely changes after wall collisions


- With friction:
```js
frictionedWalls = true
```
Lower restitution: `restitutionCoeff = 0.98`
Significant angular damping: `angularVelocity *= 0.98`
Linear velocity damping: `vx/vy *= 0.998`
Torque is applied proportional to linear velocity

Contact point's tangential velocity drives rotation:

torque = r_perpendicular × Force
Angular impulse = torque / momentOfInertia
Angular velocity changes more dramatically


Friction converts linear motion to rotational motion and gradually loses energy from the system


## Getting Started

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

### Prerequisites

- Node.js and npm installed on your machine

### Installation

1. Clone the repository:
```
git clone https://github.com/Racketlon17/2d-collision-simulator.git
```

2. Navigate to the project directory:
```
cd 2d-collision-simulator
```

3. Install dependencies:
```
npm install
```

4. Start the development server:
```
npm start
```

5. Open [http://localhost:3000](http://localhost:3000) to view the simulation in your browser.

## Usage

![image](https://github.com/user-attachments/assets/480bd1ce-c206-467e-8620-84cba0ad6182)
- Adjust the mass and initial velocities of both squares

![image](https://github.com/user-attachments/assets/3605a652-ab6d-4354-9c9b-285f0693cdc0)
- Toggle friction effects on wall collisions
- Use the simulation speed slider to slow down or speed up the physics

![image](https://github.com/user-attachments/assets/af301064-aa73-428b-875a-fd4d90aaea90)
- Press "Start Simulation" to begin
- Monitor real-time velocity and angular velocity data


## Contributing

Contributions are welcome! Please check out our [Contributing Guide](CONTRIBUTING.md) for details on how to submit pull requests, report bugs, and suggest enhancements.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by classical mechanics principles
- Built with React for performant animation
- Special thanks to contributors and the physics community

---

*Note: For educational purposes. The simulation makes some simplifications compared to real-world physics.*
