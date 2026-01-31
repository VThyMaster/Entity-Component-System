



export class ECSManager {
    constructor() {
        this.entities = new Map();
        this.component_methods = new Map();
        this.systems = new Map();
        this.archetypes = new Map();
    }
    addEntity(entity, id) {
        entity.id = id;
        entity.ecs_manager = this;
        this.entities.set(id, entity);

        const components = entity.temp_components;

        for (let c of components) {
            if (!this.component_methods.has(c.id)) {
                const funcs = Object.getOwnPropertyNames(c.constructor.prototype)
                const methods = {};

                for (let func of funcs) {
                    if (func !== `constructor`) {
                        methods[func] = c.constructor.prototype[func];
                    }
                }
                this.component_methods.set(c.id, methods);
            }
        }

        const named_comps = components.map(c => c.id);
        named_comps.sort((a, b) => a.localeCompare(b));

        const key = named_comps.join(`|`);
        entity.archetype = key;
        
        if (this.archetypes.get(key)) {
            const middle_arche = this.archetypes.get(key);
            const n = components.length;
            for (let i = 0; i < n; i++) {
                const component = components.pop();
                const final_arche = middle_arche[component.id];

                for (let k in component.props) {
                    final_arche[k].push(component.props[k]);
                }
            }

            entity.archetype_index = middle_arche.EntityIds.length;
            middle_arche.EntityIds.push(id);
        }
        else {
            const middle_arche = {};
            this.archetypes.set(key, middle_arche);

            const n = components.length;
            for (let i = 0; i < n; i++) {
                const component = components.pop();
                const final_arche = {};
                middle_arche[component.id] = final_arche; 
                
                for (let k in component.props) {
                    final_arche[k] = [component.props[k]];
                }
            }

            entity.archetype_index = 0;
            middle_arche.EntityIds = [id];
        }

        entity.temp_components = null;
    }
    _takeEntity(id) {
        const swapAndPop = (arr, i) => {
            const last = arr.length - 1;
            [arr[i], arr[last]] = [arr[last], arr[i]];
            return(arr.pop());
        }

        const entity = this.entities.get(id);
        const middle_arche = this.archetypes.get(entity.archetype);

        const entities = middle_arche.EntityIds;
        this.entities.get(entities[entities.length - 1]).archetype_index = entity.archetype_index;
        swapAndPop(entities, entity.archetype_index);

        const components = [];
        for (let k in middle_arche) {
            if (k === `EntityIds`) {
                continue;
            }

            const props = {};
            const final_arche = middle_arche[k];
            for (let prop in final_arche) {
                props[prop] = swapAndPop(final_arche[prop], entity.archetype_index);
            }

            components.push({
                props: props,
                id: k
            });
        }

        entity.temp_components = components;
        this.entities.delete(entity.id);
        return(entity);
    }
    deleteEntity(id) {
        const entity = this._takeEntity(id);
        for (let component of entity.temp_components) {
            const methods = this.component_methods.get(component.id);
            if (methods.onDelete) {
                methods.onDelete(component.props);
            }
        }
    }
    addSystem(system) {
        system.ecs_manager = this;
        this.systems.set(system.id, system);
    }
    deleteSystem(id) {
        this.systems.delete(id);
    }
    queryFor(needed_comps) {
        const valid_keys = [...this.archetypes.keys()].filter(k => {
            k = new Set(k.split(`|`));
            for (let c of needed_comps) {
                if (!k.has(c)) {
                    return(false);
                }
            }
            return(true);
        });

        const middle_arches = []
        for (let k of valid_keys) {
            middle_arches.push(this.archetypes.get(k));
        }
        return(middle_arches);
    }
    upd(dt) {
        for (let [_, system] of this.systems) {
            const middle_arches = this.queryFor(system.query_request.components);
            for (let middle_arche of middle_arches) {
                system.query_request.entities = middle_arche;
                system.upd(dt);
            }
        }
    }
}

export class Entity {
    constructor() {
        this.id = null;
        this.ecs_manager = null;
        this.archetype = null;
        this.archetype_index = null;
        this.temp_components = [];
    }
    addComponent(component) {
        if (this.temp_components) {
            this.temp_components.push(component);
        }
        else {
            this.ecs_manager._takeEntity(this.id);
            this.temp_components.push(component);
            this.ecs_manager.addEntity(this, this.id);
        }
    }
    deleteComponent(id) {
        if (this.temp_components) {
            this.temp_components = this.temp_components.filter(c => c.id !== id);
        }
        else {
            this.ecs_manager._takeEntity(this.id);
            this.temp_components = this.temp_components.filter(c => c.id !== id);
            this.ecs_manager.addEntity(this, this.id);
        }
    }
}

export class Component {
    constructor() {
        this.props = {};
        this.id = this.constructor.name
    }
    onDelete(props) {}
}

export class System {
    constructor() {
        this.ecs_manager = null;
        this.id = this.constructor.name
    }
    upd(dt) {}
}