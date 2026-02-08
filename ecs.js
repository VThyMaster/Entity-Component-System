



export class ECSManager {
    entities = new Map();
    component_handlers = new Map();
    systems = new Map();
    archetypes = new Map();

    addEntity(entity, id) {
        entity.id = id;
        entity.ecs_manager = this;
        this.entities.set(id, entity);

        const components = entity.components;

        for (let c of components) {
            if (!this.component_handlers.has(c.id)) {
                this.component_handlers.set(c.id, c.handlers);
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

        entity.components = null;
    }
    getComponents(id) {
        const entity = this.entities.get(id);
        const middle_arche = this.archetypes.get(entity.archetype);

        const components = {};
        for (let k in middle_arche) {
            if (k === `EntityIds`) {
                continue;
            }
            components[k] = {};

            const final_arche = middle_arche[k];
            for (let prop in final_arche) {
                components[k][prop] = final_arche[prop][entity.archetype_index];
            }
        }

        return(components);
    }
    _removeEntity(id) {
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

        entity.components = components;
        this.entities.delete(entity.id);
        return(entity);
    }
    deleteEntity(id) {
        const entity = this._removeEntity(id);
        for (let c of entity.components) {
            this.component_handlers.get(c.id).onDelete(c.props);
        }
    }
    addSystem(system) {
        system.ecs_manager = this;
        system.init();
        this.systems.set(system.id, system);
    }
    deleteSystem(id) {
        this.systems.delete(id);
    }
    query(query_request) {
        if (query_request.type === `WITH`) {
            const valid_keys = [...this.archetypes.keys()].filter(k => {
                k = new Set(k.split(`|`));
                for (let c of query_request.components) {
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
        else if (query_request.type === `ID`) {
            const entity = this.entities.get(query_request.id);
            const middle_arche = this.archetypes.get(entity.archetype);
    
            const components = {};
            for (let k in middle_arche) {
                if (k === `EntityIds`) {
                    continue;
                }
                const props = {};
                components[k] = props;
    
                const final_arche = middle_arche[k];
                for (let prop in final_arche) {
                    Object.defineProperty(props, prop, {
                        get: () => final_arche[prop][entity.archetype_index],
                        set: (val) => final_arche[prop][entity.archetype_index] = val
                    });
                }
            }
    
            return(components);
        }
    }
    upd(dt) {
        for (let [_, system] of this.systems) {
            system.upd(dt);
        }
    }
}

export class Entity {
    id = null;
    ecs_manager = null;
    archetype = null;
    archetype_index = null;
    components = [];

    addComponent(component) {
        if (this.components) {
            this.components.push(component);
        }
        else {
            this.ecs_manager._removeEntity(this.id);
            this.components.push(component);
            this.ecs_manager.addEntity(this, this.id);
        }
    }
    deleteComponent(id) {
        if (this.components) {
            this.components = this.components.filter(c => c.id !== id);
        }
        else {
            this.ecs_manager._removeEntity(this.id);
            this.components = this.components.filter(c => c.id !== id);
            this.ecs_manager.addEntity(this, this.id);
        }
    }
}

export class Component {
    id = this.constructor.name;
    props = {};

    handlers = {
        onDelete: (props) => {}
    };
}

export class System {
    id = this.constructor.name;
    ecs_manager = null;

    init() {}
    upd(dt) {}
}