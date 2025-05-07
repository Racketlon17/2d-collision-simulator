import React, { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

function App() {
  const [canvasWidth, setCanvasWidth] = useState(1200);
  const [canvasHeight, setCanvasHeight] = useState(800);

  // Base size for the squares - will be multiplied by mass
  const baseSizeMultiplier = 5;
  const minSize = 10;

  //Animation states
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const requestRef = useRef();
  const timeoutRef = useRef(null);
  const frameTimeRef = useRef({ lastFrameTime: 0, frameTimes: [] });
  const canvasRef = useRef(null);
  const [fps, setFps] = useState(0);

  const getScaleFactor = useCallback(() => {
    return Math.min(1, (window.innerWidth - 40) / 1200);
  }, []);

  //Pause Functionality
  const togglePause = () => {
    if (isRunning) {
      // Only allow pause/resume if the simulation is running
      setIsPaused((prevPaused) => !prevPaused);
    }
  };

  // Input states
  const [massA, setMassA] = useState(10);
  const [massB, setMassB] = useState(10);
  const [velocityAX, setVelocityAX] = useState(5);
  const [velocityAY, setVelocityAY] = useState(0);
  const [velocityBX, setVelocityBX] = useState(-5);
  const [velocityBY, setVelocityBY] = useState(0);
  const [frictionedWalls, setFrictionedWalls] = useState(false);
  const [simulationSpeed, setSimulationSpeedRaw] = useState(1);
  const debouncedSimulationSpeed = useDebounce(simulationSpeed, 50);
  const [isCanvasVisible, setIsCanvasVisible] = useState(true);
  const [showFps, setShowFps] = useState(true);

  // Momentum tracking states
  const [momentumBeforeA, setMomentumBeforeA] = useState({
    x: 0,
    y: 0,
    total: 0,
  });
  const [momentumBeforeB, setMomentumBeforeB] = useState({
    x: 0,
    y: 0,
    total: 0,
  });
  const [momentumAfterA, setMomentumAfterA] = useState({
    x: 0,
    y: 0,
    total: 0,
  });
  const [momentumAfterB, setMomentumAfterB] = useState({
    x: 0,
    y: 0,
    total: 0,
  });
  const [totalMomentumBefore, setTotalMomentumBefore] = useState(0);
  const [totalMomentumAfter, setTotalMomentumAfter] = useState(0);
  const [collisionCount, setCollisionCount] = useState(0);
  const lastCollisionTimeRef = useRef(0);

  const setSimulationSpeed = (newSpeed) => {
    setSimulationSpeedRaw(parseFloat(newSpeed));
  };

  // Calculate square sizes based on mass
  const getSquareSize = (mass) => {
    const scaleFactor = getScaleFactor();
    return Math.max(
      minSize * scaleFactor,
      mass * baseSizeMultiplier * scaleFactor
    );
  };

  const squareARef = useRef({
    x: canvasWidth / 4,
    y: canvasHeight / 2 - getSquareSize(10) / 2,
    vx: 5,
    vy: 0,
    mass: 10,
    size: getSquareSize(10),
    color: "#4285F4",
    angle: 0,
    angularVelocity: 0,
  });

  const squareBRef = useRef({
    x: (canvasWidth * 3) / 4 - getSquareSize(10),
    y: canvasHeight / 2 - getSquareSize(10) / 2,
    vx: -5,
    vy: 0,
    mass: 10,
    size: getSquareSize(10),
    color: "#EA4335",
    angle: 0,
    angularVelocity: 0,
  });

  // Live velocity display values
  const [liveVelocityA, setLiveVelocityA] = useState({
    x: 5,
    y: 0,
    angular: 0,
  });
  const [liveVelocityB, setLiveVelocityB] = useState({
    x: -5,
    y: 0,
    angular: 0,
  });

  // Calculate momentum for a square
  const calculateMomentum = (square) => {
    const px = square.mass * square.vx;
    const py = square.mass * square.vy;
    const totalMomentum = Math.sqrt(px * px + py * py);

    return {
      x: px,
      y: py,
      total: totalMomentum,
    };
  };

  // Update positions and rotations
  const updatePositions = () => {
    const squareA = squareARef.current;
    const squareB = squareBRef.current;

    // Update linear positions
    squareA.x += squareA.vx;
    squareA.y += squareA.vy;
    squareB.x += squareB.vx;
    squareB.y += squareB.vy;

    // Update rotation angles
    squareA.angle += squareA.angularVelocity;
    squareB.angle += squareB.angularVelocity;

    // Keep angles within reasonable bounds to avoid very large values
    squareA.angle = squareA.angle % (2 * Math.PI);
    squareB.angle = squareB.angle % (2 * Math.PI);

    // Update live velocity display
    setLiveVelocityA({
      x: Number(squareA.vx.toFixed(3)),
      y: Number(squareA.vy.toFixed(3)),
      angular: Number(squareA.angularVelocity.toFixed(3)),
    });

    setLiveVelocityB({
      x: Number(squareB.vx.toFixed(3)),
      y: Number(squareB.vy.toFixed(3)),
      angular: Number(squareB.angularVelocity.toFixed(3)),
    });
  };

  // Calculate moment of inertia for a square
  const calculateMomentOfInertia = (mass, size) => {
    return (1 / 6) * mass * size * size;
  };

  const checkWalls = () => {
    const squareA = squareARef.current;
    const squareB = squareBRef.current;

    // Track if collisions occurred
    let squareAHitWall = false;
    let squareBHitWall = false;

    // Calculate square centers
    const centerAX = squareA.x + squareA.size / 2;
    const centerAY = squareA.y + squareA.size / 2;
    const centerBX = squareB.x + squareB.size / 2;
    const centerBY = squareB.y + squareB.size / 2;

    // Set wall friction multiplier based on toggle state
    const wallFrictionMultiplier = frictionedWalls ? 1.0 : 0.01;

    // Set restitution coefficient based on frictionedWalls
    const restitutionCoeff = frictionedWalls ? 0.98 : 1;

    if (squareA.x <= 0 || squareA.x + squareA.size >= canvasWidth) {
      squareAHitWall = true;

      squareA.vx = -squareA.vx * restitutionCoeff;

      if (Math.abs(squareA.vy) > 0.01) {
        const inertiaA = calculateMomentOfInertia(squareA.mass, squareA.size);

        let collisionY;
        let wallX;

        if (squareA.x <= 0) {
          wallX = 0;
          collisionY =
            centerAY + ((squareA.vy > 0 ? 1 : -1) * squareA.size) / 4;
        } else {
          wallX = canvasWidth;
          collisionY =
            centerAY + ((squareA.vy > 0 ? 1 : -1) * squareA.size) / 4;
        }

        const rAx = wallX - centerAX;
        const rAy = collisionY - centerAY;

        const torque = rAx * squareA.vy - rAy * squareA.vx;
        const angularImpulse = torque / inertiaA;
        squareA.angularVelocity += angularImpulse * wallFrictionMultiplier;
      }

      // Keep in bounds
      if (squareA.x < 0) squareA.x = 0;
      if (squareA.x + squareA.size > canvasWidth)
        squareA.x = canvasWidth - squareA.size;
    }

    if (squareA.y <= 0 || squareA.y + squareA.size >= canvasHeight) {
      squareAHitWall = true;
      squareA.vy = -squareA.vy * restitutionCoeff;
      if (Math.abs(squareA.vx) > 0.01) {
        // Calculate moment of inertia
        const inertiaA = calculateMomentOfInertia(squareA.mass, squareA.size);

        let collisionX;
        let wallY;

        if (squareA.y <= 0) {
          wallY = 0;
          collisionX =
            centerAX + ((squareA.vx > 0 ? 1 : -1) * squareA.size) / 4;
        } else {
          wallY = canvasHeight;
          collisionX =
            centerAX + ((squareA.vx > 0 ? 1 : -1) * squareA.size) / 4;
        }

        const rAx = collisionX - centerAX;
        const rAy = wallY - centerAY;

        const torque = rAx * squareA.vy - rAy * squareA.vx;

        const angularImpulse = torque / inertiaA;
        squareA.angularVelocity += angularImpulse * wallFrictionMultiplier;
      }

      if (squareA.y < 0) squareA.y = 0;
      if (squareA.y + squareA.size > canvasHeight)
        squareA.y = canvasHeight - squareA.size;
    }

    if (squareB.x <= 0 || squareB.x + squareB.size >= canvasWidth) {
      squareBHitWall = true;

      squareB.vx = -squareB.vx * restitutionCoeff;

      if (Math.abs(squareB.vy) > 0.01) {
        const inertiaB = calculateMomentOfInertia(squareB.mass, squareB.size);

        let collisionY;
        let wallX;

        if (squareB.x <= 0) {
          wallX = 0;
          collisionY =
            centerBY + ((squareB.vy > 0 ? 1 : -1) * squareB.size) / 4;
        } else {
          wallX = canvasWidth;
          collisionY =
            centerBY + ((squareB.vy > 0 ? 1 : -1) * squareB.size) / 4;
        }

        const rBx = wallX - centerBX;
        const rBy = collisionY - centerBY;

        const torque = rBx * squareB.vy - rBy * squareB.vx;

        const angularImpulse = torque / inertiaB;
        squareB.angularVelocity += angularImpulse * wallFrictionMultiplier;
      }

      if (squareB.x < 0) squareB.x = 0;
      if (squareB.x + squareB.size > canvasWidth)
        squareB.x = canvasWidth - squareB.size;
    }

    if (squareB.y <= 0 || squareB.y + squareB.size >= canvasHeight) {
      squareBHitWall = true;

      squareB.vy = -squareB.vy * restitutionCoeff;

      if (Math.abs(squareB.vx) > 0.01) {
        const inertiaB = calculateMomentOfInertia(squareB.mass, squareB.size);

        let collisionX;
        let wallY;

        if (squareB.y <= 0) {
          wallY = 0;
          collisionX =
            centerBX + ((squareB.vx > 0 ? 1 : -1) * squareB.size) / 4;
        } else {
          wallY = canvasHeight;
          collisionX =
            centerBX + ((squareB.vx > 0 ? 1 : -1) * squareB.size) / 4;
        }

        const rBx = collisionX - centerBX;
        const rBy = wallY - centerBY;

        const torque = rBx * squareB.vy - rBy * squareB.vx;

        const angularImpulse = torque / inertiaB;
        squareB.angularVelocity += angularImpulse * wallFrictionMultiplier;
      }

      if (squareB.y < 0) squareB.y = 0;
      if (squareB.y + squareB.size > canvasHeight)
        squareB.y = canvasHeight - squareB.size;
    }

    if (frictionedWalls) {
      // Apply angular velocity damping only if a wall was hit
      if (squareAHitWall) {
        squareA.angularVelocity *= 0.98;
        squareA.vx *= 0.998;
        squareA.vy *= 0.998;
      }

      if (squareBHitWall) {
        squareB.angularVelocity *= 0.98;
        squareB.vx *= 0.998;
        squareB.vy *= 0.998;
      }
    } else {
      // With no friction, apply no damping on collision
      if (squareAHitWall) {
        squareA.angularVelocity *= 1;
      }

      if (squareBHitWall) {
        squareB.angularVelocity *= 1;
      }
    }
  };

  const checkCollision = () => {
    const squareA = squareARef.current;
    const squareB = squareBRef.current;

    // Calculate centers
    const centerAX = squareA.x + squareA.size / 2;
    const centerAY = squareA.y + squareA.size / 2;
    const centerBX = squareB.x + squareB.size / 2;
    const centerBY = squareB.y + squareB.size / 2;

    // Check for collision using AABB
    if (
      squareA.x < squareB.x + squareB.size &&
      squareA.x + squareA.size > squareB.x &&
      squareA.y < squareB.y + squareB.size &&
      squareA.y + squareA.size > squareB.y
    ) {
      const currentTime = performance.now();
      if (currentTime - lastCollisionTimeRef.current < 50) {
        return;
      }

      // Calculate momentum before collision
      const momentumA = calculateMomentum(squareA);
      const momentumB = calculateMomentum(squareB);

      // Save momentum before collision
      setMomentumBeforeA(momentumA);
      setMomentumBeforeB(momentumB);
      setTotalMomentumBefore(momentumA.total + momentumB.total);

      const dx = centerBX - centerAX;
      const dy = centerBY - centerAY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Normal vector pointing from A to B
      const nx = dx / distance;
      const ny = dy / distance;

      // Relative velocity
      const dvx = squareB.vx - squareA.vx;
      const dvy = squareB.vy - squareA.vy;

      // Velocity along normal
      const velAlongNormal = dvx * nx + dvy * ny;

      // Only resolve if objects are moving toward each other
      if (velAlongNormal > 0) return;

      // Coefficient of restitution
      const e = 1; // Nearly perfectly elastic collision (0 would be inelastic)

      // Calculate impulse scalar
      const impulseScalar =
        (-(1 + e) * velAlongNormal) / (1 / squareA.mass + 1 / squareB.mass);

      // Apply impulse to linear velocities
      squareA.vx -= (impulseScalar * nx) / squareA.mass;
      squareA.vy -= (impulseScalar * ny) / squareA.mass;
      squareB.vx += (impulseScalar * nx) / squareB.mass;
      squareB.vy += (impulseScalar * ny) / squareB.mass;

      // Calculate moments of inertia
      const inertiaA = calculateMomentOfInertia(squareA.mass, squareA.size);
      const inertiaB = calculateMomentOfInertia(squareB.mass, squareB.size);

      // Tangent vector (perpendicular to normal)
      const perpX = -ny;
      const perpY = nx;

      // Velocity component along tangent
      const tangentialVelocity = dvx * perpX + dvy * perpY;

      const overlapX =
        Math.min(squareA.x + squareA.size, squareB.x + squareB.size) -
        Math.max(squareA.x, squareB.x);
      const overlapY =
        Math.min(squareA.y + squareA.size, squareB.y + squareB.size) -
        Math.max(squareA.y, squareB.y);

      const contactX = Math.max(squareA.x, squareB.x) + overlapX / 2;
      const contactY = Math.max(squareA.y, squareB.y) + overlapY / 2;

      // Calculate r vectors (from center to contact point)
      const rAx = contactX - centerAX;
      const rAy = contactY - centerAY;
      const rBx = contactX - centerBX;
      const rBy = contactY - centerBY;

      // Calculate torque impulses
      const torqueImpulseA =
        rAx * (-impulseScalar * ny) - rAy * (-impulseScalar * nx);
      const torqueImpulseB =
        rBx * (impulseScalar * ny) - rBy * (impulseScalar * nx);

      // Apply angular velocity changes based on torque and inertia
      squareA.angularVelocity += torqueImpulseA / inertiaA;
      squareB.angularVelocity += torqueImpulseB / inertiaB;

      const frictionCoeff = 0.2;
      squareA.angularVelocity +=
        (-tangentialVelocity * frictionCoeff * Math.sqrt(squareA.mass)) /
        inertiaA;
      squareB.angularVelocity +=
        (tangentialVelocity * frictionCoeff * Math.sqrt(squareB.mass)) /
        inertiaB;

      // Position correction to prevent sinking
      const penetrationDepth = squareA.size / 2 + squareB.size / 2 - distance;
      if (penetrationDepth > 0) {
        // Correction percent
        const percent = 0.4;
        const correctionRatio = (percent * penetrationDepth) / distance;

        // Weight correction by inverse mass
        const totalMass = squareA.mass + squareB.mass;
        const ratioA = squareB.mass / totalMass;
        const ratioB = squareA.mass / totalMass;

        const correctionX = nx * correctionRatio;
        const correctionY = ny * correctionRatio;

        squareA.x -= correctionX * ratioA;
        squareA.y -= correctionY * ratioA;
        squareB.x += correctionX * ratioB;
        squareB.y += correctionY * ratioB;
      }

      // Calculate momentum after collision
      const postMomentumA = calculateMomentum(squareA);
      const postMomentumB = calculateMomentum(squareB);

      // Save momentum after collision
      setMomentumAfterA(postMomentumA);
      setMomentumAfterB(postMomentumB);
      setTotalMomentumAfter(postMomentumA.total + postMomentumB.total);

      setCollisionCount((prevCount) => prevCount + 1);

      lastCollisionTimeRef.current = currentTime;
    }
  };

  const drawRotatedSquare = (ctx, square) => {
    const centerX = square.x + square.size / 2;
    const centerY = square.y + square.size / 2;

    ctx.save();

    ctx.translate(centerX, centerY);

    ctx.rotate(square.angle);

    ctx.fillStyle = square.color;
    ctx.fillRect(-square.size / 2, -square.size / 2, square.size, square.size);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(square.size / 2, 0);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + square.vx * 10, centerY + square.vy * 10);
    ctx.strokeStyle = square.color;
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const animate = useCallback(() => {
    if (!isRunning) {
      return;
    }

    // Get time
    const now = performance.now();

    if (!requestRef.current || !requestRef.current.timestamp) {
      requestRef.current = {
        id: null,
        timestamp: now,
        accumulatedTime: 0,
        lastPhysicsUpdate: now,
      };
    }
    const elapsed = now - requestRef.current.timestamp;

    requestRef.current.timestamp = now;

    frameTimeRef.current.frameTimes.push(elapsed);
    if (frameTimeRef.current.frameTimes.length > 10) {
      frameTimeRef.current.frameTimes.shift();
    }

    // Track framerate every second
    if (now - (frameTimeRef.current.lastLog || 0) > 1000) {
      const avgFrameTime =
        frameTimeRef.current.frameTimes.reduce((a, b) => a + b, 0) /
        (frameTimeRef.current.frameTimes.length || 1);
      console.log(
        `FPS: ${(1000 / avgFrameTime).toFixed(
          1
        )}, Canvas visible: ${isCanvasVisible}`
      );
      // Update FPS state every second to show the result in the ui
      setFps((1000 / avgFrameTime).toFixed(1));
      frameTimeRef.current.lastLog = now;
    }

    const fixedTimestep = 16.67; // 60 FPS equivalent in ms
    requestRef.current.accumulatedTime += elapsed;

    const maxAccumulatedTime = fixedTimestep * 10;
    if (requestRef.current.accumulatedTime > maxAccumulatedTime) {
      requestRef.current.accumulatedTime = maxAccumulatedTime;
    }

    const physicsDelta = fixedTimestep / debouncedSimulationSpeed;

    let physicsUpdates = 0;

    while (requestRef.current.accumulatedTime >= physicsDelta) {
      updatePositions();
      checkCollision();
      checkWalls();

      requestRef.current.accumulatedTime -= physicsDelta;

      physicsUpdates++;

      if (physicsUpdates > 10) {
        requestRef.current.accumulatedTime = 0;
        break;
      }
    }

    if (physicsUpdates > 0) {
      requestRef.current.lastPhysicsUpdate = now;
    }

    if (canvasRef.current) {
      if (!canvasRef.current.ctx) {
        canvasRef.current.ctx = canvasRef.current.getContext("2d", {
          alpha: false,
        });
      }
      const ctx = canvasRef.current.ctx;

      const squareA = squareARef.current;
      const squareB = squareBRef.current;

      // Clear canvas
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Draw rotated squares
      drawRotatedSquare(ctx, squareA);
      drawRotatedSquare(ctx, squareB);

      if (!isCanvasVisible) {
        ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
        ctx.fillRect(0, 0, 20, 20);
      }
    }

    if (isRunning) {
      if (isCanvasVisible) {
        requestRef.current.id = window.requestAnimationFrame(animate);
      } else {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          if (isRunning) {
            requestRef.current.id = window.requestAnimationFrame(animate);
          }
        }, 16.67);
      }
    }
  }, [
    isRunning,
    debouncedSimulationSpeed,
    canvasWidth,
    canvasHeight,
    isCanvasVisible,
  ]);

  const startSimulation = () => {
    console.log("Starting simulation");

    setIsPaused(false);

    const sizeA = getSquareSize(Number(massA));
    const sizeB = getSquareSize(Number(massB));

    squareARef.current.vx = Number(velocityAX);
    squareARef.current.vy = Number(velocityAY);
    squareARef.current.mass = Number(massA);
    squareARef.current.size = sizeA;
    squareARef.current.angle = 0;
    squareARef.current.angularVelocity = 0;

    squareBRef.current.vx = Number(velocityBX);
    squareBRef.current.vy = Number(velocityBY);
    squareBRef.current.mass = Number(massB);
    squareBRef.current.size = sizeB;
    squareBRef.current.angle = 0;
    squareBRef.current.angularVelocity = 0;

    // Initialize velocity display
    setLiveVelocityA({
      x: Number(velocityAX),
      y: Number(velocityAY),
      angular: 0,
    });

    setLiveVelocityB({
      x: Number(velocityBX),
      y: Number(velocityBY),
      angular: 0,
    });

    // Initialize momentum values
    const momentumA = calculateMomentum(squareARef.current);
    const momentumB = calculateMomentum(squareBRef.current);

    setMomentumBeforeA(momentumA);
    setMomentumBeforeB(momentumB);
    setMomentumAfterA(momentumA);
    setMomentumAfterB(momentumB);
    setTotalMomentumBefore(momentumA.total + momentumB.total);
    setTotalMomentumAfter(momentumA.total + momentumB.total);

    setCollisionCount(0);
    lastCollisionTimeRef.current = 0;

    frameTimeRef.current = {
      lastFrameTime: performance.now(),
      frameTimes: [],
    };

    // Start animation
    setIsRunning(true);
  };

  // Stop function
  const stopSimulation = () => {
    setIsPaused(false);
    setIsRunning(false);

    if (requestRef.current && requestRef.current.id) {
      cancelAnimationFrame(requestRef.current.id);
      requestRef.current = null;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setFps(0);
  };

  // Reset simulation
  const resetSimulation = useCallback(() => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }

    // Calculate sizes based on current mass values
    const sizeA = getSquareSize(Number(massA));
    const sizeB = getSquareSize(Number(massB));

    // Scale factor to maintain proportion
    const scaleFactor = getScaleFactor();

    const posYA = canvasHeight / 2 - sizeA / 2;
    const posYB = canvasHeight / 2 - sizeB / 2;

    squareARef.current = {
      x: canvasWidth / 4,
      y: posYA,
      vx: Number(velocityAX),
      vy: Number(velocityAY),
      mass: Number(massA),
      size: sizeA,
      color: "#4285F4",
      angle: 0,
      angularVelocity: 0,
    };

    squareBRef.current = {
      x: (canvasWidth * 3) / 4 - sizeB,
      y: posYB,
      vx: Number(velocityBX),
      vy: Number(velocityBY),
      mass: Number(massB),
      size: sizeB,
      color: "#EA4335",
      angle: 0,
      angularVelocity: 0,
    };

    // Reset velocity display
    setLiveVelocityA({
      x: Number(velocityAX),
      y: Number(velocityAY),
      angular: 0,
    });

    setLiveVelocityB({
      x: Number(velocityBX),
      y: Number(velocityBY),
      angular: 0,
    });

    // Initialize momentum values
    const momentumA = calculateMomentum(squareARef.current);
    const momentumB = calculateMomentum(squareBRef.current);

    setMomentumBeforeA(momentumA);
    setMomentumBeforeB(momentumB);
    setMomentumAfterA(momentumA);
    setMomentumAfterB(momentumB);
    setTotalMomentumBefore(momentumA.total + momentumB.total);
    setTotalMomentumAfter(momentumA.total + momentumB.total);

    // Reset collision count
    setCollisionCount(0);
    lastCollisionTimeRef.current = 0;

    // Redraw squares
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Draw rotated squares
      drawRotatedSquare(ctx, squareARef.current);
      drawRotatedSquare(ctx, squareBRef.current);
    }
  }, [
    velocityAX,
    velocityAY,
    velocityBX,
    velocityBY,
    massA,
    massB,
    canvasWidth,
    canvasHeight,
    getScaleFactor,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsCanvasVisible(entry.isIntersecting);
        console.log(
          `Canvas is ${
            entry.isIntersecting ? "visible" : "not visible"
          } (${entry.intersectionRatio.toFixed(2)})`
        );

        if (canvas.parentElement) {
          if (entry.isIntersecting) {
            canvas.parentElement.classList.remove("throttled");
          } else {
            canvas.parentElement.classList.add("throttled");
          }
        }
      },
      {
        threshold: [0, 0.1, 0.5, 1.0],
        rootMargin: "100px",
      }
    );

    observer.observe(canvas);

    const handleScroll = () => {
      const isNearTop = window.scrollY < window.innerHeight;

      if (!isNearTop) {
        if (canvas.parentElement) {
          canvas.parentElement.classList.add("throttled");
        }
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      if (canvas) {
        observer.unobserve(canvas);
      }
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Modified useEffect for animation
  useEffect(() => {
    if (isRunning && !isPaused) {
      requestRef.current = {
        id: requestAnimationFrame(animate),
        timestamp: performance.now(),
        accumulatedTime: 0,
      };

      return () => {
        if (requestRef.current && requestRef.current.id) {
          cancelAnimationFrame(requestRef.current.id);
          requestRef.current = null;
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    }
  }, [isRunning, isPaused, animate]);

  useEffect(() => {
    if (!isRunning) {
      resetSimulation();
    }
  }, [massA, massB, resetSimulation, isRunning]);

  // Initial setup
  useEffect(() => {
    resetSimulation();

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [resetSimulation]);

  const calculateSpeed = (vx, vy) => {
    return Math.sqrt(vx * vx + vy * vy).toFixed(3);
  };

  useEffect(() => {
    const handleResize = () => {
      const scaleFactor = getScaleFactor();
      setCanvasWidth(1200 * scaleFactor);
      setCanvasHeight(800 * scaleFactor);

      if (canvasRef.current) {
        canvasRef.current.width = 1200 * scaleFactor;
        canvasRef.current.height = 800 * scaleFactor;
      }

      // Redraw if not running
      if (!isRunning) {
        resetSimulation();
      }
    };

    handleResize(); // Initialize on mount
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [getScaleFactor, isRunning, resetSimulation]);

  const formatMomentum = (value) => {
    return value.toFixed(3);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h2>2D Square Collision Simulation with Rotation</h2>

        <div className="simulation-area">
          {/* Top simulation controls */}
          <div className="simulation-controls">
            <div className="toggle-container">
              <label htmlFor="friction-toggle" className="toggle-label">
                <span className={frictionedWalls ? "active-text" : ""}>
                  Frictioned Walls
                </span>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    id="friction-toggle"
                    checked={frictionedWalls}
                    onChange={() => setFrictionedWalls(!frictionedWalls)}
                  />
                  <span className="slider"></span>
                </div>
              </label>
            </div>

            {/* Choose to display FPS with a toggle */}
            <div className="toggle-container">
              <label htmlFor="show-fps-toggle" className="toggle-label">
                <span className={showFps ? "active-text" : ""}>Show FPS</span>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    id="show-fps-toggle"
                    checked={showFps}
                    onChange={() => setShowFps(!showFps)}
                  />
                  <span className="slider"></span>
                </div>
              </label>
            </div>

            <div className="speed-slider-container">
              <label htmlFor="speed-slider" className="speed-label">
                <span>Simulation Speed: {simulationSpeed.toFixed(1)}x</span>
                <div className="slider-container">
                  <input
                    type="range"
                    id="speed-slider"
                    min="0"
                    max="5"
                    step="0.1"
                    value={simulationSpeed}
                    onChange={(e) =>
                      setSimulationSpeed(parseFloat(e.target.value))
                    }
                    className="speed-slider"
                  />
                </div>
              </label>
            </div>
          </div>

          {/* Canvas with side panels */}
          <div className="canvas-with-panels">
            {/* Left panel - Square A */}
            <div className="velocity-display blue">
              <h4>Square A (Blue)</h4>
              <div>Vx: {liveVelocityA.x.toFixed(3)}</div>
              <div>Vy: {liveVelocityA.y.toFixed(3)}</div>
              <div>
                Speed: {calculateSpeed(liveVelocityA.x, liveVelocityA.y)}
              </div>
              <div>Angular: {liveVelocityA.angular.toFixed(3)} rad/f</div>
              <div>Mass: {massA}</div>
            </div>

            {/* Center canvas - use the sticky-canvas class */}
            <div
              className={`canvas-container ${
                frictionedWalls ? "wooden-walls" : ""
              }`}
            >
              <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className="sticky-canvas"
              />

              {/* FPS display */}
              {showFps && <span className="canvas-fps">{fps} FPS</span>}
            </div>

            {/* Right panel - Square B */}
            <div className="velocity-display red">
              <h4>Square B (Red)</h4>
              <div>Vx: {liveVelocityB.x.toFixed(3)}</div>
              <div>Vy: {liveVelocityB.y.toFixed(3)}</div>
              <div>
                Speed: {calculateSpeed(liveVelocityB.x, liveVelocityB.y)}
              </div>
              <div>Angular: {liveVelocityB.angular.toFixed(3)} rad/f</div>
              <div>Mass: {massB}</div>
            </div>
          </div>

          {/* Momentum display */}
          <div className="momentum-display">
            <h3>
              Momentum Values{" "}
              {collisionCount > 0 ? `(Collision #${collisionCount})` : ""}
            </h3>
            <div className="momentum-table">
              <div className="momentum-header">
                <div className="momentum-cell"></div>
                <div className="momentum-cell">Before Collision</div>
                <div className="momentum-cell">After Collision</div>
              </div>
              <div className="momentum-row">
                <div className="momentum-cell blue-text">Square A (X)</div>
                <div className="momentum-cell">
                  {formatMomentum(momentumBeforeA.x)}
                </div>
                <div className="momentum-cell">
                  {formatMomentum(momentumAfterA.x)}
                </div>
              </div>
              <div className="momentum-row">
                <div className="momentum-cell blue-text">Square A (Y)</div>
                <div className="momentum-cell">
                  {formatMomentum(momentumBeforeA.y)}
                </div>
                <div className="momentum-cell">
                  {formatMomentum(momentumAfterA.y)}
                </div>
              </div>
              <div className="momentum-row">
                <div className="momentum-cell blue-text">Square A (Total)</div>
                <div className="momentum-cell">
                  {formatMomentum(momentumBeforeA.total)}
                </div>
                <div className="momentum-cell">
                  {formatMomentum(momentumAfterA.total)}
                </div>
              </div>
              <div className="momentum-row">
                <div className="momentum-cell red-text">Square B (X)</div>
                <div className="momentum-cell">
                  {formatMomentum(momentumBeforeB.x)}
                </div>
                <div className="momentum-cell">
                  {formatMomentum(momentumAfterB.x)}
                </div>
              </div>
              <div className="momentum-row">
                <div className="momentum-cell red-text">Square B (Y)</div>
                <div className="momentum-cell">
                  {formatMomentum(momentumBeforeB.y)}
                </div>
                <div className="momentum-cell">
                  {formatMomentum(momentumAfterB.y)}
                </div>
              </div>
              <div className="momentum-row">
                <div className="momentum-cell red-text">Square B (Total)</div>
                <div className="momentum-cell">
                  {formatMomentum(momentumBeforeB.total)}
                </div>
                <div className="momentum-cell">
                  {formatMomentum(momentumAfterB.total)}
                </div>
              </div>
              <div className="momentum-row total-row">
                <div className="momentum-cell">Total System Momentum</div>
                <div className="momentum-cell">
                  {formatMomentum(totalMomentumBefore)}
                </div>
                <div className="momentum-cell">
                  {formatMomentum(totalMomentumAfter)}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom controls */}
          <div className="controls-container">
            <div className="square-controls">
              <h3 className="blue-text">Square A (Blue)</h3>
              <div className="input-group">
                <label>Mass:</label>
                <input
                  type="number"
                  value={massA}
                  onChange={(e) => setMassA(Number(e.target.value) || 1)}
                  min="1"
                  disabled={isRunning}
                />
              </div>
              <div className="input-group">
                <label>Velocity X:</label>
                <input
                  type="number"
                  value={velocityAX}
                  onChange={(e) => setVelocityAX(e.target.value)}
                  disabled={isRunning}
                  step="0.1"
                />
              </div>
              <div className="input-group">
                <label>Velocity Y:</label>
                <input
                  type="number"
                  value={velocityAY}
                  onChange={(e) => setVelocityAY(e.target.value)}
                  disabled={isRunning}
                  step="0.1"
                />
              </div>
            </div>

            <div className="square-controls">
              <h3 className="red-text">Square B (Red)</h3>
              <div className="input-group">
                <label>Mass:</label>
                <input
                  type="number"
                  value={massB}
                  onChange={(e) => setMassB(Number(e.target.value) || 1)}
                  min="1"
                  disabled={isRunning}
                />
              </div>
              <div className="input-group">
                <label>Velocity X:</label>
                <input
                  type="number"
                  value={velocityBX}
                  onChange={(e) => setVelocityBX(e.target.value)}
                  disabled={isRunning}
                  step="0.1"
                />
              </div>
              <div className="input-group">
                <label>Velocity Y:</label>
                <input
                  type="number"
                  value={velocityBY}
                  onChange={(e) => setVelocityBY(e.target.value)}
                  disabled={isRunning}
                  step="0.1"
                />
              </div>
            </div>
          </div>

          <div className="button-container">
            {!isRunning ? (
              <>
                <button onClick={startSimulation} className="start-button">
                  Start Simulation
                </button>
                <button onClick={resetSimulation} className="reset-button">
                  Reset
                </button>
              </>
            ) : (
              <>
                <button onClick={stopSimulation} className="stop-button">
                  Stop Simulation
                </button>
                <button
                  onClick={togglePause}
                  className={isPaused ? "start-button" : "reset-button"}
                  disabled={!isRunning}
                >
                  {isPaused ? "Resume" : "Pause"}
                </button>
              </>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
