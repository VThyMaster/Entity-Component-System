Entity Component System I made.

## Code
```js
const ecs_manager = new ECSManager();



const falling_dog = new Entity();

class Position extends Component {
    constructor() {
        super();

        // Set up different properties for the component.
        this.props = {
            x: 0,
            y: 100,
            z: 0
        };
    }
}
class Velocity extends Component {
    constructor() {
        super();
    
        this.props = {
            x: 0,
            y: 0,
            z: 0
        };
    }
}

falling_dog.addComponent(new Position());
falling_dog.addComponent(new Velocity());

ecs_manager.addEntity(falling_dog, `falling_dog`);



class Gravity extends System {
    constructor() {
        super();

        // Request the ECSManager for entities with specific components.
        this.query_request = {
            type: `ENTITIES WITH`,
            components: [`Position`, `Velocity`],
            entities: null
        };
        this.gravity = -9.8;
    }
    upd(dt) {
        // Instantiate variables for the components props used.
        const {
            "EntityIds": entity_ids,
            "Position": {
                y: y_positions
            },
            "Velocity": {
                y: y_velocities
            },
        } = this.query_request.entities; // Set those variables.

        for (let i = 0; i < entity_ids.length; i++) {
            // Do logic for the i-th entity.
            y_velocities[i] += this.gravity * dt;
            y_positions[i] += y_velocities[i];
        }
    }
}
ecs_manager.addSystem(new Gravity());



const gameloop = (dt) => {
    ecs_manager.upd(dt);
}
```