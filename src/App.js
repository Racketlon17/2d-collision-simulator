import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

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
  const canvasWidth = 1200;
  const canvasHeight = 800;
  
  // Base size for the squares - will be multiplied by mass
  const baseSizeMultiplier = 5;
  const minSize = 10;

  //Animation states
  const [isRunning, setIsRunning] = useState(false);
  const requestRef = useRef();
  const timeoutRef = useRef(null);
  const frameTimeRef = useRef({ lastFrameTime: 0, frameTimes: [] });
  const canvasRef = useRef(null);
  
  // Input states
  const [massA, setMassA] = useState(10);
  const [massB, setMassB] = useState(10);
  const [velocityAX, setVelocityAX] = useState(2);
  const [velocityAY, setVelocityAY] = useState(0);
  const [velocityBX, setVelocityBX] = useState(-2);
  const [velocityBY, setVelocityBY] = useState(0);
  const [frictionedWalls, setFrictionedWalls] = useState(false);
  const [simulationSpeed, setSimulationSpeedRaw] = useState(1);
  const debouncedSimulationSpeed = useDebounce(simulationSpeed, 50);
  const [isCanvasVisible, setIsCanvasVisible] = useState(true);

  const setSimulationSpeed = (newSpeed) => {
    setSimulationSpeedRaw(parseFloat(newSpeed));
  };
  
  // Calculate square sizes based on mass
  const getSquareSize = (mass) => {
    return Math.max(minSize, mass * baseSizeMultiplier);
  };
  
  const squareARef = useRef({
    x: 300,
    y: canvasHeight / 2 - getSquareSize(10) / 2,
    vx: 2,
    vy: 0,
    mass: 10,
    size: getSquareSize(10),
    color: '#4285F4',
    angle: 0,
    angularVelocity: 0
  });
  
  const squareBRef = useRef({
    x: 800,
    y: canvasHeight / 2 - getSquareSize(10) / 2,
    vx: -2,
    vy: 0,
    mass: 10,
    size: getSquareSize(10),
    color: '#EA4335',
    angle: 0,
    angularVelocity: 0
  });
  
  // Live velocity display values
  const [liveVelocityA, setLiveVelocityA] = useState({ x: 2, y: 0, angular: 0 });
  const [liveVelocityB, setLiveVelocityB] = useState({ x: -2, y: 0, angular: 0 });
  
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
      x: Number(squareA.vx.toFixed(2)),
      y: Number(squareA.vy.toFixed(2)),
      angular: Number(squareA.angularVelocity.toFixed(3))
    });
    
    setLiveVelocityB({
      x: Number(squareB.vx.toFixed(2)),
      y: Number(squareB.vy.toFixed(2)),
      angular: Number(squareB.angularVelocity.toFixed(3))
    });
  };
  
  // Calculate moment of inertia for a square
  const calculateMomentOfInertia = (mass, size) => {
    return (1/6) * mass * size * size;
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
    const restitutionCoeff = frictionedWalls ? 0.98 : 0.9999;
    
    if (squareA.x <= 0 || squareA.x + squareA.size >= canvasWidth) {
      squareAHitWall = true;
      
      
      squareA.vx = -squareA.vx * restitutionCoeff;
      
      if (Math.abs(squareA.vy) > 0.01) {
        const inertiaA = calculateMomentOfInertia(squareA.mass, squareA.size);
        
        let collisionY;
        let wallX;
        
        if (squareA.x <= 0) {
          wallX = 0;
          collisionY = centerAY + (squareA.vy > 0 ? 1 : -1) * squareA.size / 4;
        } else {
          wallX = canvasWidth;
          collisionY = centerAY + (squareA.vy > 0 ? 1 : -1) * squareA.size / 4;
        }
        
        const rAx = wallX - centerAX;
        const rAy = collisionY - centerAY;
        
        const torque = rAx * squareA.vy - rAy * squareA.vx;
        const angularImpulse = torque / inertiaA;
        squareA.angularVelocity += angularImpulse * wallFrictionMultiplier;
      }
      
      // Keep in bounds
      if (squareA.x < 0) squareA.x = 0;
      if (squareA.x + squareA.size > canvasWidth) squareA.x = canvasWidth - squareA.size;
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
          collisionX = centerAX + (squareA.vx > 0 ? 1 : -1) * squareA.size / 4;
        } else {
          wallY = canvasHeight;
          collisionX = centerAX + (squareA.vx > 0 ? 1 : -1) * squareA.size / 4;
        }
        
        const rAx = collisionX - centerAX;
        const rAy = wallY - centerAY;
        
        const torque = rAx * squareA.vy - rAy * squareA.vx;
        
        const angularImpulse = torque / inertiaA;
        squareA.angularVelocity += angularImpulse * wallFrictionMultiplier;
      }
      
      if (squareA.y < 0) squareA.y = 0;
      if (squareA.y + squareA.size > canvasHeight) squareA.y = canvasHeight - squareA.size;
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
          collisionY = centerBY + (squareB.vy > 0 ? 1 : -1) * squareB.size / 4;
        } else {
          wallX = canvasWidth;
          collisionY = centerBY + (squareB.vy > 0 ? 1 : -1) * squareB.size / 4;
        }
        
        const rBx = wallX - centerBX;
        const rBy = collisionY - centerBY;
        
        const torque = rBx * squareB.vy - rBy * squareB.vx;
        
        const angularImpulse = torque / inertiaB;
        squareB.angularVelocity += angularImpulse * wallFrictionMultiplier;
      }
    
      if (squareB.x < 0) squareB.x = 0;
      if (squareB.x + squareB.size > canvasWidth) squareB.x = canvasWidth - squareB.size;
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
          collisionX = centerBX + (squareB.vx > 0 ? 1 : -1) * squareB.size / 4;
        } else {
          wallY = canvasHeight;
          collisionX = centerBX + (squareB.vx > 0 ? 1 : -1) * squareB.size / 4;
        }
        
        const rBx = collisionX - centerBX;
        const rBy = wallY - centerBY;
        
        const torque = rBx * squareB.vy - rBy * squareB.vx;
        
        const angularImpulse = torque / inertiaB;
        squareB.angularVelocity += angularImpulse * wallFrictionMultiplier;
      }

      if (squareB.y < 0) squareB.y = 0;
      if (squareB.y + squareB.size > canvasHeight) squareB.y = canvasHeight - squareB.size;
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
      // With no friction, apply minimal damping only on collision
      if (squareAHitWall) {
        squareA.angularVelocity *= 0.9999;
      }
      
      if (squareBHitWall) {
        squareB.angularVelocity *= 0.9999;
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
      const dx = centerBX - centerAX;
      const dy = centerBY - centerAY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const nx = dx / distance;
      const ny = dy / distance;
      
      const dvx = squareB.vx - squareA.vx;
      const dvy = squareB.vy - squareA.vy;
      
      const velAlongNormal = dvx * nx + dvy * ny;
      
      if (velAlongNormal > 0) return;
      
      const e = 1; // Nearly perfectly elastic collision set 0 for inelastic
      const impulseScalar = (-(1 + e) * velAlongNormal) / 
                           (1/squareA.mass + 1/squareB.mass);
      
      squareA.vx -= (impulseScalar * nx) / squareA.mass;
      squareA.vy -= (impulseScalar * ny) / squareA.mass;
      squareB.vx += (impulseScalar * nx) / squareB.mass;
      squareB.vy += (impulseScalar * ny) / squareB.mass;
      
      const inertiaA = calculateMomentOfInertia(squareA.mass, squareA.size);
      const inertiaB = calculateMomentOfInertia(squareB.mass, squareB.size);
      
      const perpX = -ny;
      const perpY = nx;
      
      const tangentialVelocity = dvx * perpX + dvy * perpY;

      //Adjust
      const rotationFactor = 0.3;
      
      squareA.angularVelocity += -tangentialVelocity * rotationFactor / Math.sqrt(inertiaA);
      squareB.angularVelocity += tangentialVelocity * rotationFactor / Math.sqrt(inertiaB);
      
      const penetrationDepth = (squareA.size/2 + squareB.size/2) - distance;
      if (penetrationDepth > 0) {
        const percent = 0.4;
        const correction = (penetrationDepth / distance) * percent;
        
        const correctionX = nx * correction;
        const correctionY = ny * correction;
        
        squareA.x -= correctionX * 0.5;
        squareA.y -= correctionY * 0.5;
        squareB.x += correctionX * 0.5;
        squareB.y += correctionY * 0.5;
      }
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
    ctx.lineTo(
      centerX + square.vx * 10,
      centerY + square.vy * 10
    );
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
        lastPhysicsUpdate: now
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
      const avgFrameTime = frameTimeRef.current.frameTimes.reduce((a, b) => a + b, 0) / 
                          (frameTimeRef.current.frameTimes.length || 1);
      console.log(`FPS: ${(1000 / avgFrameTime).toFixed(1)}, Canvas visible: ${isCanvasVisible}`);
      frameTimeRef.current.lastLog = now;
    }
    
    const fixedTimestep = 16.67; // 60 FPS equivalent in ms
    requestRef.current.accumulatedTime += elapsed;
    
    const maxAccumulatedTime = fixedTimestep * 5;
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
      // Use cached context for better performance
      if (!canvasRef.current.ctx) {
        // Create context with alpha:false for better performance
        canvasRef.current.ctx = canvasRef.current.getContext('2d', { alpha: false });
      }
      const ctx = canvasRef.current.ctx;
      
      const squareA = squareARef.current;
      const squareB = squareBRef.current;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      // Draw rotated squares
      drawRotatedSquare(ctx, squareA);
      drawRotatedSquare(ctx, squareB);
      
      // Debug indicator showing if we're running at full speed
      if (!isCanvasVisible) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(0, 0, 20, 20); // Red indicator in corner when not visible
      }
    }
    
    if (isRunning) {
      if (isCanvasVisible) {
        requestRef.current.id = window.requestAnimationFrame(animate);
      } else {
        // When not visible, use setTimeout with fixed rate to bypass throttling
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          if (isRunning) {
            requestRef.current.id = window.requestAnimationFrame(animate);
          }
        }, 16.67);
      }
    }
  }, [isRunning, debouncedSimulationSpeed, canvasWidth, canvasHeight, isCanvasVisible]);
  
  const startSimulation = () => {
    console.log("Starting simulation");
    
    // Calculate sizes based on current mass values
    const sizeA = getSquareSize(Number(massA));
    const sizeB = getSquareSize(Number(massB));
    
    // Update square values from inputs
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
      angular: 0
    });
    
    setLiveVelocityB({
      x: Number(velocityBX),
      y: Number(velocityBY),
      angular: 0
    });
    
    // Reset frame time tracking
    frameTimeRef.current = {
      lastFrameTime: performance.now(),
      frameTimes: []
    };
    
    // Start animation
    setIsRunning(true);
  };
  
  // Improved stop function
  const stopSimulation = () => {
    // Set the flag to stop animation
    setIsRunning(false);
    
    // Cancel any existing animation frame immediately
    if (requestRef.current && requestRef.current.id) {
      cancelAnimationFrame(requestRef.current.id);
      requestRef.current = null;
    }
    
    // Explicitly clear any pending timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };
  
  // Reset simulation
  const resetSimulation = useCallback(() => {
    // Cancel any existing animation
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    
    // Calculate sizes based on current mass values
    const sizeA = getSquareSize(Number(massA));
    const sizeB = getSquareSize(Number(massB));
    
    // Position squares at center-left and center-right of canvas, adjusted for size
    const posYA = canvasHeight / 2 - sizeA / 2;
    const posYB = canvasHeight / 2 - sizeB / 2;
    
    // Reset squares to initial positions with new sizes
    squareARef.current = {
      x: 300,
      y: posYA,
      vx: Number(velocityAX),
      vy: Number(velocityAY),
      mass: Number(massA),
      size: sizeA,
      color: '#4285F4',
      angle: 0,
      angularVelocity: 0
    };
    
    squareBRef.current = {
      x: 800,
      y: posYB,
      vx: Number(velocityBX),
      vy: Number(velocityBY),
      mass: Number(massB),
      size: sizeB,
      color: '#EA4335',
      angle: 0,
      angularVelocity: 0
    };
    
    // Reset velocity display
    setLiveVelocityA({
      x: Number(velocityAX),
      y: Number(velocityAY),
      angular: 0
    });
    
    setLiveVelocityB({
      x: Number(velocityBX),
      y: Number(velocityBY),
      angular: 0
    });
    
    // Redraw squares
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      // Draw square A
      ctx.fillStyle = '#4285F4';
      ctx.fillRect(300, posYA, sizeA, sizeA);
      
      // Draw square B
      ctx.fillStyle = '#EA4335';
      ctx.fillRect(800, posYB, sizeB, sizeB);
    }
  }, [velocityAX, velocityAY, velocityBX, velocityBY, massA, massB]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsCanvasVisible(entry.isIntersecting);
        console.log(`Canvas is ${entry.isIntersecting ? 'visible' : 'not visible'} (${entry.intersectionRatio.toFixed(2)})`);
        
        if (canvas.parentElement) {
          if (entry.isIntersecting) {
            canvas.parentElement.classList.remove('throttled');
          } else {
            canvas.parentElement.classList.add('throttled');
          }
        }
      },
      { 
        threshold: [0, 0.1, 0.5, 1.0], // Check at different visibility thresholds
        rootMargin: "100px"
      }
    );
    
    // Start observing the canvas
    observer.observe(canvas);
    
    const handleScroll = () => {
      const isNearTop = window.scrollY < window.innerHeight;
      
      if (!isNearTop) {
        if (canvas.parentElement) {
          canvas.parentElement.classList.add('throttled');
        }
      }
    };
    
    // Add scroll listener
    window.addEventListener('scroll', handleScroll);
    
    // Cleanup function
    return () => {
      if (canvas) {
        observer.unobserve(canvas);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // Modified useEffect for animation
  useEffect(() => {
    if (isRunning) {
      // Initialize timestamp tracking object
      requestRef.current = {
        id: requestAnimationFrame(animate),
        timestamp: performance.now(),
        accumulatedTime: 0
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
  }, [isRunning, animate]);
  
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
  
  // Calculate speed
  const calculateSpeed = (vx, vy) => {
    return Math.sqrt(vx * vx + vy * vy).toFixed(2);
  };
  
  return (
    <div className="App">
      <header className="App-header">
        <h2>2D Square Collision Simulation with Rotation</h2>
        <div className="simulation-area">
          {/* Top simulation controls */}
          <div className="simulation-controls">
            <div className="friction-toggle-container">
              <label htmlFor="friction-toggle" className="friction-label">
                <span className={frictionedWalls ? "active-text" : ""}>Frictioned Walls</span>
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
  
            <div className="speed-slider-container">
              <label htmlFor="speed-slider" className="speed-label">
                <span>Simulation Speed: {simulationSpeed.toFixed(1)}x</span>
                <div className="slider-container">
                  <input
                    type="range"
                    id="speed-slider"
                    min="0.1"
                    max="5"
                    step="0.1"
                    value={simulationSpeed}
                    onChange={(e) => setSimulationSpeed(parseFloat(e.target.value))}
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
              <div>Vx: {liveVelocityA.x.toFixed(2)}</div>
              <div>Vy: {liveVelocityA.y.toFixed(2)}</div>
              <div>Speed: {calculateSpeed(liveVelocityA.x, liveVelocityA.y)}</div>
              <div>Angular: {liveVelocityA.angular.toFixed(3)} rad/f</div>
              <div>Mass: {massA}</div>
            </div>
            
            {/* Center canvas - use the sticky-canvas class */}
            <div className={`canvas-container ${frictionedWalls ? "wooden-walls" : ""}`}>
              <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className="sticky-canvas" // Added class for the sticky canvas fix
              />
            </div>
            
            {/* Right panel - Square B */}
            <div className="velocity-display red">
              <h4>Square B (Red)</h4>
              <div>Vx: {liveVelocityB.x.toFixed(2)}</div>
              <div>Vy: {liveVelocityB.y.toFixed(2)}</div>
              <div>Speed: {calculateSpeed(liveVelocityB.x, liveVelocityB.y)}</div>
              <div>Angular: {liveVelocityB.angular.toFixed(3)} rad/f</div>
              <div>Mass: {massB}</div>
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
              <button onClick={stopSimulation} className="stop-button">
                Stop Simulation
              </button>
            )}
          </div>
        </div>        
      </header>
    </div>
  );
}

export default App;