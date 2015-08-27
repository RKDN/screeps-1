





    Memory.logger = {};
    Memory.logger.level = 0;
    Memory.logger.indentation = ["", "  ", "    ", "      ", "        ", "          ", "            ", "              ", "                ", "                "];
    function logCompact(text) {
        console.log(
            Memory.logger.indentation[Memory.logger.level] + text
        );
    }
    function logDetail(text) {
        console.log(
            Memory.logger.indentation[Memory.logger.level] + text
        );
    }
    function logError(text) {
        console.log(
            Memory.logger.indentation[Memory.logger.level] + '!!!ERROR!!!' + text
        );
    }
    function logLevelIncrease() {
        Memory.logger.level ++;
    }
    function logLevelDecrease() {
        Memory.logger.level --;
    }
    Memory.timer = {};

    function timerBegin(module, timerName) { timerBegin_(module, timerName, ""); }
    function timerEnd(module, timerName) { timerEnd_(module, timerName, ""); }
    function timerBegin_(module, timerName, text) {
        logDetail('--> ' + timerName + ' ' + text);
        logLevelIncrease();
        Memory.timer[timerName] = Game.getUsedCpu();
    }
    function timerEnd_(module, timerName, text) {
        Memory.timer[timerName] = Game.getUsedCpu() - Memory.timer[timerName];
        logLevelDecrease();
        logDetail('<-- ' + timerName + ' [' + Memory.timer[timerName].toFixed(1) + '] ' + text
        );
    }


    console.log('===============================================' + Game.time +
                 '===============================================');


timerBegin("main", 'main');



var CTask = function CTask(type, targetId, pos, qty, energySource) {
    this.type = type;
    this.targetId = targetId;
    this.pos = pos;
    this.qty = qty;
    this.qtyAssigned = 0;
    this.energySource = energySource;




    this.assignments = {};

    switch (this.type) {
        case 'T_HARVEST': this.bodyTypes = ['harvester', 'default']; break;
        case 'T_COLLECT': this.bodyTypes = ['default']; break;
        case 'T_DELIVER': this.bodyTypes = ['default']; break;
        case 'T_UPGRADE': this.bodyTypes = ['upgrader', 'default']; break;
        case 'T_BUILD': this.bodyTypes = ['default']; break;
        case 'T_REPAIR': this.bodyTypes = ['default']; break;
        default:
            this.logError('task type ' + type + ' not available.');
            return;
    }
};


CTask.prototype.getType = function() {
    return this.type;
};
CTask.prototype.getTarget = function() {
    return Game.getObjectById(this.targetId);
};
CTask.prototype.getPos = function() {
    if (this.pos.construtor !== RoomPosition) {
        this.pos.__proto__ = RoomPosition.prototype;
    }
    return this.pos;
};



CTask.prototype.getRoom = function() {
    return Game.rooms[this.pos.roomName];
};
CTask.prototype.getQty = function() {
    return this.qty;
};




CTask.prototype.getQtyAssigned = function() {

        var qtyAssigned = 0;
        _.forEach(this.getAssignments(), function(assignment) {
            qtyAssigned += assignment;
        });
        this.qtyAssigned = qtyAssigned;

    return this.qtyAssigned;
};
CTask.prototype.getAssignments = function() {
    return this.assignments;
};
CTask.prototype.getAssignmentsCnt = function() {
    return Object.keys(this.assignments).length;
};
CTask.prototype.getBodyTypes = function() {
    return this.bodyTypes;
};




CTask.prototype.getCode = function() {
    if (this.code === undefined) {
        this.code = this.type + "_" + this.pos.x + "_" + this.pos.y;
    }
    return this.code;
};

CTask.prototype.getPrio = function() {
    if (this.prio === undefined) {
        switch (this.type) {
            case 'T_HARVEST': this.prio = 50; break;
            case 'T_COLLECT': this.prio = 60; break;
            case 'T_DELIVER':
                if (this.getTarget().structureType === STRUCTURE_STORAGE)
                    this.prio = 15;
                else
                    this.prio = 55;
                break;
            case 'T_UPGRADE': this.prio = 10; break;
            case 'T_BUILD': this.prio = 20; break;
            case 'T_REPAIR': this.prio = 30; break;
            default:
                this.logError('task type ' + type + ' not available.');
                return;
        }
    }
    return this.prio;
};







CTask.prototype.assignmentSearch = function() {
    var creep = null;
    var task = this;
    _.forEach(this.getBodyTypes(), function(bodyType) {
        var room = task.getPos().getRoom();
        if (!creep) {
            if (task.energySource) {
                if (room.hasCreepEmpty(bodyType)) {
                    creep = task.getPos().findClosestCreepEmpty(bodyType);
                    if (!(creep instanceof Creep)) room.hasCreepEmpty(bodyType, true);
                }
            } else {
                if (room.hasCreepFull(bodyType)) {
                    creep = task.getPos().findClosestCreepFull(bodyType);
                    if (!(creep instanceof Creep)) room.hasCreepFull(bodyType, true);
                }
            }
        }
    });
    return creep;
};






CTask.prototype.assignmentCreate = function(creep) {
    var qty = 0;
    switch (this.type) {
        case 'T_HARVEST':
            if (creep.getBodyType() === 'harvester') qty = this.qty;
            else qty = 1;
            break;
        case 'T_COLLECT': qty = creep.carryCapacity - creep.carry.energy; break;
        case 'T_DELIVER': qty = creep.carry.energy; break;
        case 'T_UPGRADE': qty = 1; break;
        case 'T_BUILD':
        case 'T_REPAIR': qty = 1; break;
        default:
            this.logError("Can't assign task, type " + type + " not available.");
            return;
    }
    if (qty > this.qty) qty = this.qty;
    this.assignments[creep.name] = qty;
    delete this.qtyAssigned;
};





CTask.prototype.assignmentDelete = function(creepName) {
    delete this.assignments[creepName];
    delete this.qtyAssigned;
};






CTask.prototype.equals = function(task) {
    if (this.type === task.type
        && this.targetId === task.targetId
        && this.pos === task.pos
        && this.qty === task.qty
        && this.energySource === task.energySource
        && this.energySink === task.energySink
    ) {
        return true;
    } else {
        return false;
    }
};





CTask.prototype.update = function(task) {
    this.type = task.type;
    this.targetId = task.targetId;
    this.pos = task.pos;
    this.qty = task.qty;
    this.energySource = task.energySource;
    this.energySink = task.energySink;
};




CTask.prototype.delete = function() {
    this.getRoom().getTasks().del(this);
};






var CTasks = function CTasks()
{
    this.list = [];
    this.collection = {};
};



CTasks.prototype.getList = function() {
    return this.list;
};
CTasks.prototype.getCollection = function() {
    return this.collection;
};
CTasks.prototype.get = function(taskCode) {
    var task = this.collection[taskCode];
    if (task && task.constructor !== CTask)
        task.__proto__ = CTask.prototype;
    return task;
};
CTasks.prototype.add = function(task) {
    var myTask = this.get(task.getCode());
    if (myTask === undefined) {
        this.list.push(task.getCode());
        this.collection[task.getCode()] = task;
    } else if (!myTask.equals(task)) {
        myTask.update(task);
    }
};




CTasks.prototype.del = function(task) {
    var taskCode;
    if (task instanceof String) taskCode = task;
    else taskCode = task.getCode();
    if (this.get(taskCode)) {
        this.list.splice(this.list.indexOf(task.getCode()), 1);
        delete this.collection[taskCode];
    } else {
        this.logError("Task does not exist.");
    }
};

CTasks.prototype.sort = function() {
    var tasks = this;
    this.list.sort(
        function(taskCodeA, taskCodeB) {
            var a = 0, b = 0;
            var taskA = tasks.get(taskCodeA), taskB = tasks.get(taskCodeB);
            if (taskA instanceof CTask) a = taskA.getPrio();
            else logError("wrong task " + taskCodeA);
            if (taskB instanceof CTask) b = taskB.getPrio();
            else logError("wrong task " + taskCodeB);
            return b - a;
        }
    );
};

CTasks.prototype.getCount = function() {
    return this.count = Object.keys(this.collection).length;;
};



Spawn.prototype.spawn = function(body, bodyParts) {
    var result = this.createCreep(bodyParts);
    if(_.isString(result)) {
        this.room.logCompact('Spawning: ' + result + " with Body: " + bodyParts
                + " / new sum: " + (this.room.creeps.length + 1));
        if (body == 'ranger') Memory.creeps[result].role = 'guard';
        Memory.creeps[result].body = body;
    } else {
        if (result != ERR_BUSY)
            this.room.logCompact('Spawn error: ' + result
                + ' while try to spawn ' + JSON.stringify(bodyParts));
    }
}

Spawn.prototype.spawnDefault = function() {
    var bodyParts;
    if (
        this.room.creepsDefault.length >= this.room.creepsRequired() * 0.5
        && this.room.extensions.length >= 9
    ) {
        bodyParts = [WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
    } else if ( this.room.extensions.length >= 6 ) {
        bodyParts = [WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
    } else if ( this.room.extensions.length >= 5 ) {
        bodyParts = [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE];
    } else if ( this.room.extensions.length >= 2 ) {
        bodyParts = [WORK, WORK, CARRY, CARRY, MOVE, MOVE];
    } else if ( this.room.creepsDefault.length >= this.room.creepsRequired() * 0.2 ) {
        bodyParts = [WORK, CARRY, MOVE, MOVE];
    } else {
        bodyParts = [WORK, CARRY, MOVE];
    }
    this.spawn('default', bodyParts);
}

Spawn.prototype.spawnHarvester = function() {
    var bodyParts;
    if (this.room.extensions.length >= 6) {
        bodyParts = [ WORK, WORK, WORK, WORK, WORK, CARRY, MOVE ];
    } else if (this.room.extensions.length >= 5) {
        bodyParts = [ WORK, WORK, WORK, WORK, WORK, MOVE ];
    }
    this.spawn('harvester', bodyParts);
}

Spawn.prototype.spawnUpgrader = function() {
    if (this.room.extensions.length >= 20) {
        var bodyParts = [
            WORK, WORK, WORK, WORK, WORK,
            WORK, WORK, WORK, WORK, WORK,
            MOVE, MOVE, MOVE, MOVE, CARRY, MOVE
        ];
    } else if (this.room.extensions.length >= 30) {
        var bodyParts = [
            WORK, WORK, WORK, WORK, WORK,
            WORK, WORK, WORK, WORK, WORK,
            WORK, WORK, WORK, WORK, WORK,
            MOVE, MOVE, MOVE, CARRY, MOVE
        ];

    }
    this.spawn('upgrader', bodyParts);
}

Spawn.prototype.spawnHealer = function() {
    var bodyParts;
    if (this.room.extensions.length >= 20) {
        bodyParts = [ MOVE, MOVE, MOVE,
            HEAL, HEAL, HEAL, HEAL,
            MOVE
        ];
    } else {
        bodyParts = [MOVE, HEAL];
    }
    this.spawn('healer', bodyParts);
}

Spawn.prototype.spawnRanger = function() {
    var bodyParts;
    if (this.room.extensions.length >= 40) {
        bodyParts = [
            TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
            TOUGH, TOUGH, TOUGH, TOUGH,

            MOVE, MOVE, MOVE, MOVE, MOVE,
            MOVE, MOVE, MOVE, MOVE,
            RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
            RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
            RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
            MOVE
        ];
    } else if (this.room.extensions.length >= 30) {
        bodyParts = [
            TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
            TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
            TOUGH, TOUGH, TOUGH,
            MOVE, MOVE, MOVE, MOVE, MOVE,
            MOVE, MOVE, MOVE, MOVE,
            RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
            RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
            MOVE
        ];
    } else if (this.room.extensions.length >= 20) {
        bodyParts = [
            TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
            TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
            MOVE, MOVE, MOVE, MOVE, MOVE,
            RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
            MOVE
        ];
    } else {
        this.logError("can't create ranger");
    }
    this.spawn('ranger', bodyParts);
}
Structure.prototype.isFull = function() {
    return this.energy >= this.energyCapacity;
}

Structure.prototype.isEmpty = function() {
    return this.energy <= 0;
}


Source.prototype.memory = undefined;

Source.prototype.getMemory = function() {
    if (!this.memory) {
        this.memory = this.room.memory.sources[this.id];
    }
    return this.memory;
}

Source.prototype.getSpotsCnt = function() {
    if (this.getMemory().spotsCnt === undefined) {
        this.getMemory().spotsCnt = this.pos.getSpotsCnt();
    }
    return this.getMemory().spotsCnt;
}

RoomPosition.prototype.findEnemiesInAttackRange = function(opts) {
    return this.findInRange(FIND_HOSTILE_CREEPS, 4, opts);
};
RoomPosition.prototype.findEnemyStructuresInAttackRange = function(opts) {
    return this.findInRange(FIND_HOSTILE_STRUCTURES, 6, opts);
};

RoomPosition.prototype.findClosestEmptyExtension = function(opts) {
    return this.findClosest(FIND_MY_STRUCTURES, {
        filter: function(object) {return object.structureType == STRUCTURE_EXTENSION && object.energy != object.energyCapacity;}
    });
};
RoomPosition.prototype.findClosestEnergyContainer = function(opts) {
    var spawn = this.findClosest(FIND_MY_SPAWNS, {
        filter: function(object) { return object.energy > 0;}
    });
    var extension = this.findClosest(FIND_MY_STRUCTURES, {
        filter: function(object) { return object.structureType == STRUCTURE_EXTENSION && object.energy > 0;}
    });
    if ( spawn ) rangeS = this.getRangeTo(spawn);
    else rangeS = 99999999;
    if ( extension ) rangeE = this.getRangeTo(extension);
    else rangeE = 99999999;
    if (!extension && !spawn) return this.findClosest(FIND_MY_SPAWNS);
    else if (extension && rangeE <= rangeS ) return extension;
    else if (spawn && rangeS <= rangeE ) return spawn;
    else console.log("error while findng a energy source");
};

RoomPosition.prototype.findInRangeLink = function(range) {
    return this.findInRange(FIND_MY_STRUCTURES, range, {
        filter: function(object) {return object.structureType == STRUCTURE_LINK}
    });
};

RoomPosition.prototype.findClosestSearchingDefaultWorker = function() {
    return this.findClosest(FIND_MY_CREEPS,
        { filter:
            function (creep) {
                return creep.memory.body == 'default' && (creep.memory.phase == undefined || creep.memory.phase == 'search');
            }
        }
    );
}
RoomPosition.prototype.findClosestSearchingHarvester = function() {
    return this.findClosest(FIND_MY_CREEPS,
        { filter:
            function (creep) {
                return creep.memory.body == 'harvester' && (creep.memory.phase == undefined || creep.memory.phase == 'search');
            }
        }
    );
}
RoomPosition.prototype.findClosestSearchingUpgrader = function() {
    return this.findClosest(FIND_MY_CREEPS,
        { filter:
            function (creep) {
                return creep.memory.body == 'upgrader' && (creep.memory.phase == undefined || creep.memory.phase == 'search');
            }
        }
    );
}






RoomPosition.prototype.findClosestCreepEmpty = function(_bodyType) {
    var bodyType = _bodyType;
    return this.findClosest(FIND_MY_CREEPS, { filter:
        function (creep) {
            return creep.memory.body === bodyType
                    && (creep.memory.phase === 'search'
                        || creep.memory.phase === undefined)
                    && creep.carry.energy < 50;
        }
    });
};

RoomPosition.prototype.findClosestCreepFull = function(_bodyType) {
    var bodyType = _bodyType;
    return this.findClosest(FIND_MY_CREEPS, { filter:
        function (creep) {
            return creep.memory.body === bodyType
                    && (creep.memory.phase === 'search'
                        || creep.memory.phase === undefined)
                    && creep.carry.energy >= 50;
        }
    });
};

RoomPosition.prototype.getRoom = function() {
    return Game.rooms[this.roomName];
}


RoomPosition.prototype.getSpotsCnt = function() {
    timerBegin_("room", 'getSpotsCnt', 'of room ' + this.getRoom().name);
    var cnt = 0;
    var positions = this.getRoom().lookForAtArea('terrain', this.y - 1, this.x - 1, this.y + 1, this.x + 1);

    for (var y in positions) {
        for (var x in positions[y]) {
            var isFree = true;
            for (var i in positions[y][x])
                if (positions[y][x][i] === 'wall') isFree = false;
            if (isFree) ++ cnt;
        }
    }
    timerBegin_("room", 'getSpotsCnt', cnt);
    return cnt;
};

RoomPosition.prototype.getInRangePositions = function(distance) {
    var poss = new Array(9);
    var i = 0;
    for (var y = this.y - distance; y < this.y + distance; ++ y) {
        for (var x = this.x - distance; x < this.x + distance; ++ x) {
            poss[i ++] = new RoomPosition(x,y,this.roomName);
        }
    }
    return poss;
}


Creep.prototype.runDefault = function() {
    if (
        this.memory.phase === undefined
        || this.memory.phase === 'search'
        || !this.getCurrentTask()
    ) {
        this.memory.phase = 'search';
    }

    if (this.memory.phase === 'search') {
        this.moveAround();
    }
    if (this.memory.phase === 'task') {

        switch (this.getCurrentTask().getType()) {
            case 'T_HARVEST': this.taskHarvest(); break;
            case 'T_COLLECT': this.taskCollect(); break;
            case 'T_DELIVER': this.taskDeliver(); break;
            case 'T_UPGRADE': this.taskUpgrade(); break;
            case 'T_BUILD': this.taskBuild(); break;
            case 'T_REPAIR': this.taskRepair(); break;
            default:
                this.logError("task type " + this.getCurrentTask().getType() + " not available");
                return;
        }
    }
};

Creep.prototype.getCurrentTask = function() {
    if (!this.task && this.memory.taskCodes[0]) {
        this.task = this.room.getTasks().get(this.memory.taskCodes[0]);
        if (!(this.task instanceof CTask)) {
            this.taskDisassign();
            this.logError("task " + this.memory.taskCodes[0] + " not available")
        }
    }
    return this.task;
};

Creep.prototype.taskAssign = function(task) {
    logDetail(JSON.stringify(this.getTaskCodes()));
    this.getTaskCodes().push(task.getCode());
    logDetail(JSON.stringify(this.getTaskCodes()));
    this.memory.phase = 'task';
};

Creep.prototype.taskDisassign = function(task) {
    if (task instanceof CTask) {
        var i = this.memory.taskCodes.indexOf(task.getCode());
        if (i >= 0) delete this.memory.taskCodes[i];
    } else {

        this.memory.taskCodes.shift();
    }
    if (!this.memory.taskCodes[0]) {
        this.memory.phase = 'search';
    }
    delete this.task;
};

Creep.prototype.getTaskCodes = function() {
    if (!this.memory.taskCodes)
        this.memory.taskCodes = [];
    return this.memory.taskCodes;
};

Creep.prototype.hasTask = function(task) {
    if ( this.memory.phase !== 'task'
        || this.getTaskCodes().indexOf(task.getCode()) === -1
    ) {
        return false;
    }
    return true;
};

Creep.prototype.taskHarvest = function() {
    if (this.memory.body === 'default' && this.carry.energy >= this.carryCapacity) {
        this.taskDisassign();
        return;
    }
    var source = this.getCurrentTask().getTarget();
    if ( source !== null ) {
        if (this.carry.energy < this.carryCapacity * 0.8 || !source.getMemory().linkId) {
            this.movePredefined(source.pos);
        } else {
            var link = Game.getObjectById(source.getMemory().linkId)
            this.movePredefined(link.pos);
            this.transferEnergy(link);
        }
        this.harvest(source);
    } else {
        this.logError("target not valid");
        this.getCurrentTask().delete();
        this.taskDisassign();
    }
};

Creep.prototype.taskCollect = function() {
    if (this.carry.energy >= this.carryCapacity) {
        this.taskDisassign();
        return;
    }
    var target = this.getCurrentTask().getTarget();
    if (target) {
        this.movePredefined(target.pos);
        this.pickup(target);
    } else {
        this.logError("target not valid");
        this.getCurrentTask().delete();
        this.taskDisassign();
    }
};

Creep.prototype.taskDeliver = function() {
    if (this.carry.energy <= 0) {
        this.taskDisassign();
        return;
    }
    var target = this.getCurrentTask().getTarget();
    if (
        target !== null
        && (
            (target.structureType === STRUCTURE_STORAGE
                && target.store.energy < target.storeCapacity)
            || (
                (target.structureType === STRUCTURE_SPAWN
                    || target.structureType === STRUCTURE_EXTENSION
                    || target.structureType === STRUCTURE_LINK)
                && target.energy < target.energyCapacity)
        )
    ) {
        this.movePredefined(target.pos);
        this.transferEnergy(target);
    } else {
        this.logError("target not valid");
        this.getCurrentTask().delete();
        this.taskDisassign();
    }
};

Creep.prototype.taskUpgrade = function() {
    if (this.carry.energy <= 0) {
        this.taskDisassign();
        return;
    }
    var target = this.getCurrentTask().getTarget();
    if (target !== null) {

        this.movePredefined(target.pos);
        this.upgradeController(target);
    } else {
        this.logError("target not valid");
        this.getCurrentTask().delete();
        this.taskDisassign();
    }
};

Creep.prototype.taskBuild = function() {
    if (this.carry.energy <= 0) {
        this.taskDisassign();
        return;
    }
    var target = this.getCurrentTask().getTarget();
    if (target !== null) {
        this.movePredefined(target.pos);
        var result = this.build(target);
        if (result !== OK && result !== ERR_NOT_IN_RANGE) {
            if (result === ERR_NO_BODYPART) this.movePredefined(this.room.defaultSpawn.pos);
            else this.logError(this.name + " can't build " + result);
        }
    } else {
        this.logError("target not valid");
        this.getCurrentTask().delete();
        this.taskDisassign();
    }
};

Creep.prototype.taskRepair = function() {
    if (this.carry.energy <= 0) {
        this.taskDisassign();
        return;
    }
    var target = this.getCurrentTask().getTarget();
    if (target !== null) {


    } else {
        this.logError("target not valid");
        this.getCurrentTask().delete();
        this.taskDisassign();
    }
};



Creep.prototype.runUpgrader = function() {
    if (!this.memory.phase || this.memory.phase === 'search') {
        this.fillOnStorage();
    }
    if (this.memory.phase === 'task') {
        if (this.carry.energy > this.carryCapacity / 2) {
            this.movePredefined(this.room.controller.pos);
        } else {
            this.fillOnStorage();
        }
        this.upgradeController(this.room.controller);
    }
}

Creep.prototype.fillOnStorage = function() {
    var storage = this.room.controllerStorage;
    if (storage) {
        this.movePredefined(storage.pos);
        restult = storage.transferEnergy(this);
    } else {
        this.logError("no controller storage available");
    }
}



Creep.prototype.runRanger = function() {
    var target = this.pos.findClosest(this.room.getHostileCreeps());
    if (target) {
        if (target.owner.username != 'Source Keeper') {
            Game.notify("User " + target.owner.username + " moved into room " + this.room.name + " with body " + JSON.stringify(target.body), 0);
        }

        if (!this.pos.inRangeTo(target, 3))
            this.movePredefined(target);
        if (this.pos.inRangeTo(target, 2) || this.hits < this.hitsMax * 0.3)
            this.movePredefined(this.room.defaultSpawn);
        this.rangedAttack(target);
        this.memory.currentTargetId = target.id;

    } else {
        var collectionPoint = Game.flags[this.room.name];
        if (collectionPoint) {
            this.movePredefined(collectionPoint.pos, {}, true);
        }







        delete this.memory.currentTargetId;
    }
}


Creep.prototype.runHealer = function() {
    var damagedCreep = this.pos.findClosest(FIND_MY_CREEPS, {
        filter: function(object) {
            return object !== this && object.hits < object.hitsMax;
        }
    });
    if (this.hits < this.hitsMax - 50 ) {
        this.movePredefined(this.room.defaultSpawn);
        this.heal(damagedCreep);
        this.rangedHeal(damagedCreep);
        return;
    }

    if(damagedCreep) {
        var hisTarget = Game.getObjectById(damagedCreep.memory.currentTargetId);
        if (hisTarget && this.pos.inRangeTo(hisTarget, 3))
            this.movePredefined(this.room.defaultSpawn);
        else
            if (!this.pos.inRangeTo(damagedCreep, 1))
                this.movePredefined(damagedCreep);
        this.rangedHeal(damagedCreep);
        this.heal(damagedCreep);
        return;
    }
    if (this.room.name == 'W12S3' && Game.rooms.W12S2.creepsHealer.length < 2) {
        this.movePredefined(Game.flags.W12S2.pos);
        return;
    }

    var guard = this.pos.findClosest(FIND_MY_CREEPS, {
        filter: function(creep) {
            return creep.memory.role === 'guard';
        }
    });
    if (guard) {
        if (!this.pos.inRangeTo(guard, 1))
           this.movePredefined(guard);
    } else {
        var collectionPoint = Game.flags[this.room.name];
        if (collectionPoint) {
          this.movePredefined(collectionPoint.pos, {}, true);
        } else {
            this.movePredefined(this.room.defaultSpawn);
        }
    }
}



Creep.prototype.run = function() {
    var body = this.memory.body;
    if (body === 'default') this.runDefault();
    else if (body === 'harvester') this.runDefault();
    else if (body === 'upgrader') this.runUpgrader();
    else if (body === 'healer') this.runHealer();
    else if (body === 'ranger') this.runRanger();
    else this.logError("has no role");
}



Creep.prototype.movePredefined = function(targetPos, opts, onPos) {
    if (!this.pos.inRangeTo(targetPos, 1) || onPos) {
        if (!opts) opts = {};
        opts.reusePath = 3;
        opts.avoid = this.room.getUnsavePostions();
        this.moveTo(targetPos, opts);
    }
}

Creep.prototype.getBodyType = function() {
    return this.memory.body;
}

Creep.prototype.moveAround = function() {
    this.move(Game.time % 8 + 1);
}

Creep.prototype.moveRandom = function() {
    this.move(Math.floor(Math.random() * 8) % 8 + 1);
}


Creep.prototype.logCompact = function(message) {
    logCompact('[' + this.room.name + '] ' + '[' + this.name + '] ' + message);
}
Creep.prototype.logDetail = function(message) {
    logDetail('[' + this.room.name + '] ' + '[' + this.name + '] ' + message);
}
Creep.prototype.logError = function(message) {
    logError('[' + this.room.name + '] ' + '[' + this.name + '] ' + message);
}
Room.prototype.findDroppedEnergy = function() {
    return this.find(FIND_DROPPED_ENERGY,
        { filter:
            function (energy) {
                return energy.energy >= 20;
            }
        }
    );
};

Room.prototype.getTasks = function() {
    if (this.memory.tasks === undefined) {
        this.memory.tasks = new CTasks();
    }
    if (!(this.memory.tasks instanceof CTasks))
        this.memory.tasks.__proto__ = CTasks.prototype;
    return this.memory.tasks;
}

Room.prototype.initTasksStatic = function() {
    timerBegin_("room", 'initTasksStatic', 'of room ' + this.name);
    for (var id in this.sources) {
        var source = this.sources[id];
        if (source.getMemory().isSave) {
            this.createTask(
                    'T_HARVEST',
                    source.id,
                    source.pos,
                    source.getSpotsCnt()
            );
        }
    }
    if (this.controller instanceof Structure && this.controller.my) {
        this.createTask(
            'T_UPGRADE',
            this.controller.id,
            this.controller.pos,
            this.controller.pos.getSpotsCnt()
        );
    }
    timerEnd("room", 'initTasks');
}

Room.prototype.initTasksDynamic = function() {
    timerBegin_("room", 'initTasksDynamic', 'of room ' + this.name);
    for (var i in this.energy) {
        var energy = this.energy[i];

        this.createTask(
                'T_COLLECT',
                energy.id,
                energy.pos,
                energy.energy
        );
    }
    if (this.controller instanceof Structure) {
        for (var i in this.extensions) {
            var ext = this.extensions[i];
            if (ext.energy < ext.energyCapacity) {
                this.createTask(
                        'T_DELIVER',
                        ext.id,
                        ext.pos,
                        ext.energyCapacity - ext.energy
                );
            }
        }
        for (var i in this.spawns) {
            var spawn = this.spawns[i];
            if (spawn.energy < spawn.energyCapacity) {
                this.createTask(
                        'T_DELIVER',
                        spawn.id,
                        spawn.pos,
                        spawn.energyCapacity - spawn.energy
                );
            }
        }
    }
        logDetail(JSON.stringify(this.storage));
    if (this.storage instanceof Structure) {
        if (this.storage.store.energy < this.storage.storeCapacity) {
            this.createTask(
                'T_DELIVER',
                this.storage.id,
                this.storage.pos,
                this.storage.storeCapacity - this.storage.store.energy
            );
        }
    }
    timerEnd("room", 'initTasksDynamic');
}



Room.prototype.initTasksDynamic2 = function() {
    timerBegin_("room", 'initTasksDynamic2', 'of room ' + this.name);
    if (this.controller instanceof Structure) {
        for (var i in this.constructions) {
            var construction = this.constructions[i];
            if (construction instanceof ConstructionSite) {
                this.createTask(
                        'T_BUILD',
                        construction.id,
                        construction.pos,
                        2
                );
            }
        }
    }
    timerEnd("room", 'initTasksDynamic2');
}

Room.prototype.createTask = function(type, targetId, pos, qty) {
    timerBegin_("room", 'createTask', 'in room ' + this.name);
    var energySource = false;
    switch (type) {
        case 'T_HARVEST':
            energySource = true;
            break;
        case 'T_COLLECT':
            energySource = true;
            break;
        case 'T_DELIVER':
            energySource = false;
            break;
        case 'T_UPGRADE':
            energySource = false;
            break;
        case 'T_BUILD':
            energySource = false;
            break;
        case 'T_REPAIR':
            energySource = false;
            break;
        default:
            this.logError('task type ' + type + ' not available.');
            return;
    }
    var task = new CTask(type, targetId, pos, qty, energySource);
    this.getTasks().add(task);
    timerEnd("room", 'createTask');
}

Room.prototype.assignTasks = function(withHandshake) {
    timerBegin_("room", 'assignTasks', 'of room ' + this.name);
    var tasks = this.getTasks();
    tasks.sort();
    var taskList = tasks.getList();
    for (var i in taskList) {
        var task = tasks.get(taskList[i]);


        var assignments = task.getAssignments();
        if (withHandshake) {
            for (var creepName in assignments) {
                var creep = Game.creeps[creepName];
                if ( !creep ) {
                    task.assignmentDelete(creepName);
                } else if (!creep.hasTask(task)) {
                    task.assignmentDelete(creepName);
                    creep.taskDisassign(task);
                }
            }
        }
        while (task.getQtyAssigned() < task.getQty()) {
            var creep = task.assignmentSearch();
            if (creep instanceof Creep) {
                task.assignmentCreate(creep);
                creep.taskAssign(task);
            } else {
                logDetail(JSON.stringify("no creep found"));
                break;
            }
        }

    }

    timerEnd("room", 'assignTasks');
}



Room.prototype.run = function() {
    this.initCreeps();
    if (!this.memory.timer || this.memory.timer <= 0) {
        timerBegin_("room", 'static_init', 'of room ' + this.name);
            this.memory.timer = -1;
            this.initSources();
            this.memory.timer = 600;
        timerEnd("room", 'static_init');
    }

    timerBegin_("room", 'load', 'of room ' + this.name);
        this.loadSources();
        this.loadStructures();
        this.loadConstructions();
        this.energy = this.findDroppedEnergy();
    timerEnd("room", 'load');


    if (this.memory.timer % 15 == 0) {
        timerBegin_("room", 'dynamic_init', 'of room ' + this.name);
            this.initDynamicSources();
            this.initDynamicConstructions();
            this.initDynamicStructures();
        timerEnd("room", 'dynamic_init');
    }

    if (this.memory.timer === 600) {
        this.initTasksStatic();
    } else if (this.memory.timer % 30 == 0) {
        this.initTasksDynamic2();
    } else if (this.memory.timer % 5 == 0) {
        this.initTasksDynamic();
    }

    timerBegin_("room", 'actions', 'of room ' + this.name);
        var withHandshake = this.memory.timer % 15 == 0;
        this.assignTasks(withHandshake);
this.repairerWorkerAction();
        this.structuresAction();
        this.guardAction();
        this.spawnAction();
    timerEnd("room", 'actions');

    -- this.memory.timer;
}


Room.prototype.initSources = function() {
    timerBegin_("room", 'initSources', 'of room ' + this.name);
    if (!this.memory.sources)
        this.memory.sources = {};

    for (var source of this.find(FIND_SOURCES)) {
        if (!this.memory.sources[source.id])
            this.memory.sources[source.id] = {id: source.id};
        source.getSpotsCnt();
    }

    this.memory.hostileSpawnIds = [];
    this.memory.hostileSpawns = this.find(FIND_HOSTILE_STRUCTURES);
    for (var hostileSpawnNr in this.memory.hostileSpawns) {
        this.memory.hostileSpawnIds[hostileSpawnNr] = this.memory.hostileSpawns[hostileSpawnNr].id;
    }
    timerEnd("room", 'initSources');
}
Room.prototype.loadSources = function() {
    this.sources = {};
    for (var id in this.memory.sources) {
        this.sources[id] = Game.getObjectById(id);
    }

    this.hostileSpawns = [];
    for (var hostileSpawnNr in this.memory.hostileSpawns) {
        var hostileSpawnId = this.memory.hostileSpawns[hostileSpawnNr].id;
        this.hostileSpawns[hostileSpawnNr] = Game.getObjectById(hostileSpawnId);
    }
}
Room.prototype.initDynamicSources = function() {
    this.memory.sourcesSaveCount = 0;
    this.memory.sourceSpotCount = 0;
    for (var id in this.sources) {
        var source = this.sources[id];

        source.getMemory().isSave = (
                this.creepsHealer.length >= 4 * this.hostileSpawns.length
                && this.creepsRanger.length >= 3 * this.hostileSpawns.length
            ) || !source.getMemory().hasHostileSpawn;
        if (source.getMemory().isSave) {
            this.memory.sourcesSaveCount ++;
            this.memory.sourceSpotCount += source.getSpotsCnt();
        }

        var link = source.pos.findInRangeLink(2);
        if (link[0] != undefined) source.getMemory().linkId = link[0].id;
    }
};


Room.prototype.initDynamicStructures = function() {
    this.memory.extensionIds = [];

    this.extensions = this.find(
        FIND_MY_STRUCTURES,
        {filter: {structureType: STRUCTURE_EXTENSION}}
    );
    for (var extensionNr in this.extensions)
        this.memory.extensionIds[extensionNr] = this.extensions[extensionNr].id;

    var storages = this.controller.pos.findInRange(
        FIND_MY_STRUCTURES, 2, {filter: {structureType: STRUCTURE_STORAGE}}
    );
    if (storages[0] != undefined) this.memory.controllerStorageId = storages[0].id;

    if (this.getStorage() instanceof Structure) {
        var links = this.getStorage().pos.findInRangeLink(2);
        if (links[0] != undefined) this.memory.storageLinkId = links[0].id;
    }
}
Room.prototype.loadStructures = function() {
    this.extensions = [];
    for (var extensionNr in this.memory.extensionIds) {
        var extensionId = this.memory.extensionIds[extensionNr];
        this.extensions[extensionNr] = Game.getObjectById(extensionId);
    }
    this.storageLink = Game.getObjectById(this.memory.storageLinkId);
    this.controllerStorage = Game.getObjectById(this.memory.controllerStorageId);

};
Room.prototype.structuresAction = function() {
    for (var i in this.sources) {
        var linkId = this.sources[i].getMemory().linkId;
        if (linkId) {
            var link = Game.getObjectById(linkId);
            if (link.isFull() && this.storageLink.isEmpty()) {
                link.transferEnergy(this.storageLink);
                break;
            }
        }
    }
};
Room.prototype.getStorage = function() {
    if (this.storage === undefined) {
        var storages = this.find(FIND_MY_STRUCTURES,
            {filter: {structureType: STRUCTURE_STORAGE}}
        );
        if (storages[0] != undefined) {
            this.storage = storages[0];
        } else {
            this.storage = false;
        }
    }
    return this.storage;
}

Room.prototype.initDynamicConstructions = function() {
    this.memory.constructionIds = [];

    this.constructions = this.find(FIND_CONSTRUCTION_SITES);
    for (var i in this.constructions)
        this.memory.constructionIds[i] = this.constructions[i].id;
}
Room.prototype.loadConstructions = function() {
    this.constructions = [];
    for (var i in this.memory.constructionIds) {
        this.constructions[i] = (Game.getObjectById(this.memory.constructionIds[i]));
    }
}
Room.prototype.repairerWorkerAction = function() {
logDetail(JSON.stringify("do not need repairer"));
return;

    var repairerCount = 3;

    var creeps = this.find(FIND_MY_CREEPS,
        { filter:
            function (creep) {
                return creep.memory.role == 'repairer'
            }
        }
    );
    var oldRepairersCount = creeps.length;

    if (oldRepairersCount < repairerCount) {
        creeps = this.findSearchingDefaultWorkerFull();
        if (creeps.length == 0) creeps = this.findSearchingDefaultWorker();
        for(var i = 0; i < repairerCount - oldRepairersCount; ++ i) {
            if (creeps[i]) {
                creeps[i].memory.phase = 'repair';
                this.logDetail("add a repairer " + creeps[i].name);
            }
        }
    }
}


Room.prototype.initCreeps = function() {
    this.creepsDefault = this.find(FIND_MY_CREEPS, {filter: {memory: {body: 'default'}}});
    this.creepsHarvester = this.find(FIND_MY_CREEPS, {filter: {memory: {body: 'harvester'}}});
    this.creepsUpgrader = this.find(FIND_MY_CREEPS, {filter: {memory: {body: 'upgrader'}}});
    this.creepsRanger = this.find(FIND_MY_CREEPS, {filter: {memory: {body: 'ranger'}}});
    this.creepsHealer = this.find(FIND_MY_CREEPS, {filter: {memory: {body: 'healer'}}});

    this.creeps = this.creepsDefault.concat(this.creepsHarvester, this.creepsUpgrader, this.creepsRanger, this.creepsHealer);
}
Room.prototype.guardAction = function() {
    for (rangerNr in this.creepsRanger) {
        var creep = this.creepsRanger[rangerNr];

            creep.memory.hostileSpawnNr = rangerNr % this.hostileSpawns.length;
    }
}
Room.prototype.getDefaultHarvesterCount = function() {
    if (this.defaultHarvesterCount == undefined) {
        this.defaultHarvesterCount = 0;
        if (this.creepsHarvester.length < 1) {
            for (var id in this.sources) {
                var source = this.sources[id];
                if (source.getMemory().isSave)
                    if (source.getMemory().creepName) ++ this.defaultHarvesterCount;
                    else this.defaultHarvesterCount += source.getSpotsCnt();
            }
        }
    }
    return this.defaultHarvesterCount;
}
Room.prototype.getDefaultUpgraderCount = function() {
    if (this.controllerStorage instanceof Structure) return 0;
    else return 1;
}
Room.prototype.creepsRequired = function() {
    return this.getDefaultHarvesterCount();
}
Room.prototype.creepsRequiredAllWork = function() {
    return (2*this.memory.sourcesSaveCount) + this.getDefaultHarvesterCount() + this.getDefaultUpgraderCount();
}




Room.prototype.spawnAction = function() {
    for (var spawnId in this.spawns) {
        var spawn = this.spawns[spawnId];

        var bodyParts;
        var body;
        if ( this.creepsDefault.length > this.creepsRequired()
            && this.creepsHarvester.length < this.memory.sourcesSaveCount
            && this.extensions.length >= 5
        ) {
            spawn.spawnHarvester();
        } else if (this.creepsDefault.length < this.creepsRequiredAllWork()) {
            spawn.spawnDefault();
        } else if ( this.creepsHealer.length < 2
            && this.extensions.length >= 20
        ) {
            spawn.spawnHealer();
        } else if ( this.creepsRanger.length < 2
            && this.extensions.length >= 20
        ) {
            spawn.spawnRanger();
        } else if ( this.controllerStorage instanceof Structure
            && this.creepsUpgrader.length < 1
            && this.extensions.length >= 20
        ) {
            spawn.spawnUpgrader();
        } else {
            this.logCompact('SPAWN: no creep is required');
        }
        break;
    }
}


Room.prototype.getHostileCreeps = function() {
    if (this.hostileCreeps == undefined) {
        this.hostileCreeps = this.find(FIND_HOSTILE_CREEPS);
    }
    return this.hostileCreeps;
}


Room.prototype.logCompact = function(message) {
    logCompact('[' + this.name + "] " + message);
}
Room.prototype.logDetail = function(message) {
    logDetail('[' + this.name + "] " + message);
}
Room.prototype.logError = function(message) {
    logError('[' + this.name + "] " + message);
}

Room.prototype.getUnsavePostions = function() {
    if (this.poss === undefined) {
        this.poss = [];
        var creeps = this.getHostileCreeps();
        for (var i in creeps) {
            var creep = creeps[i];
            this.poss = this.poss.concat(creep.pos.getInRangePositions(3));
        }
    }
    return this.poss;
}

Room.prototype.hasCreepEmpty = function(bodyType, setNoCreep) {
    if (this.noCreepEmpty === undefined)
        this.noCreepEmpty = [];
    if (setNoCreep)
        this.noCreepEmpty[bodyType] = true;
    return this.noCreepEmpty[bodyType] === undefined;
}
Room.prototype.hasCreepFull = function(bodyType, setNoCreep) {
    if (this.noCreepFull === undefined)
        this.noCreepFull = [];
    if (setNoCreep)
        this.noCreepFull[bodyType] = true;
    return this.noCreepFull[bodyType] === undefined;
}


timerBegin("main", 'game');
var managerGame = require('CManagerGame');
managerGame.run();
timerEnd("main", 'game');


timerBegin("main", 'room');
for (var roomName in Game.rooms) {
    var room = Game.rooms[roomName];

    room.spawns = room.find(FIND_MY_STRUCTURES, {filter:{structureType:STRUCTURE_SPAWN}});
    if (room.spawns.length > 0) {
        room.defaultSpawn = room.spawns[0];
    } else {
        room.defaultSpawn = Game.spawns.Spawn1;
    }

    room.run();
}
timerEnd("main", 'room');


timerBegin("main", 'creeps');
for(var creepName in Game.creeps) {
    var creep = Game.creeps[creepName];


        creep.run();

}
timerEnd("main", 'creeps');



timerEnd("main", 'main');
