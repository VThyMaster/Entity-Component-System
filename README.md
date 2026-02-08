Entity Component System I made.

## Code
```js
const ecs_manager = new ECSManager();



const falling_dog = new Entity();

class Position extends Component {
    // Set up different properties for the component.
    props = {
        x: 0,
        y: 100,
        z: 0
    };
}
class Velocity extends Component {
    props = {
        x: 0,
        y: 0,
        z: 0
    };
}

falling_dog.addComponent(new Position());
falling_dog.addComponent(new Velocity());

ecs_manager.addEntity(falling_dog, `falling_dog`);



class Gravity extends System {
    gravity = -9.8;

    upd(dt) {
        // Request the ECSManager for all entities with specific components.
        const middle_arches = this.ecs_manager.query({
            type: `WITH`,
            components: [`Position`, `Velocity`]
        });

        // Loop over the archetypes to loop over all entities with the specific components.
        for (let middle_arche of middle_arches) {
            // Instantiate variables for the components props used.
            const {
                "EntityIds": entity_ids,
                "Position": {y: y_positions},
                "Velocity": {y: y_velocities},
            } = middle_arche; // Set those variables.
            
            for (let i = 0; i < entity_ids.length; i++) {
                // Do logic for the i-th entity.
                y_velocities[i] += this.gravity * dt;
                y_positions[i] += y_velocities[i] * dt;
            }
        }
    }
}
ecs_manager.addSystem(new Gravity());



const gameloop = (dt) => {
    ecs_manager.upd(dt);
}
```