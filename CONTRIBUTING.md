# Contributing to 2D Square Collision Simulation

Thank you for your interest in contributing to our 2D Square Collision Simulation with Rotation! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

Please be respectful and considerate in all interactions. We aim to foster an inclusive and welcoming community.

## How to Contribute

### Reporting Bugs

If you find a bug in the simulation:

1. Check if the issue already exists in the [Issues](https://github.com/Racketlon17/2d-collision-simulator/issues) section
2. If not, create a new issue with:
   - A clear, descriptive title
   - A detailed description of the bug
   - Steps to reproduce the behavior
   - Screenshots if applicable
   - Information about your browser and device

### Suggesting Enhancements

We welcome ideas for improvements to the simulation:

1. Create an issue to suggest your enhancement
2. Clearly describe the feature and its benefits
3. Provide examples of how the feature would work, if possible

### Pull Requests

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Test your changes thoroughly
5. Commit your changes (`git commit -m 'Add some feature'`)
6. Push to the branch (`git push origin feature/your-feature`)
7. Create a Pull Request

## Development Guidelines

### Code Style

- Use consistent indentation (2 spaces)
- Follow JavaScript best practices
- Add comments for complex sections of code
- Use meaningful variable and function names

### Physics Simulation

When working on the physics aspects:

- Ensure conservation of momentum in collisions
- Test edge cases thoroughly (different mass ratios, velocities, etc.)
- Document any mathematical models or formulas used
- Consider performance implications for animation

### UI/UX Changes

- Keep the interface intuitive and responsive
- Test on different screen sizes
- Consider accessibility

## Testing

Before submitting a pull request:

1. Test all simulation parameters
2. Verify that collisions behave realistically
3. Check that walls and boundaries work correctly
4. Ensure the UI remains responsive

## Project Structure

- `App.js` - Main application component containing simulation logic
- CSS files - Styling for the simulation
- React components - UI elements for controls and display

## Questions?

If you have any questions about contributing, please open an issue for discussion.

Thank you for helping improve this simulation!
