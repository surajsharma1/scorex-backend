"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Models index - ensures all Mongoose models are registered globally
require("./Player");
require("./User");
require("./Team");
require("./Tournament");
require("./Match");
require("./Bracket");
require("./Message");
require("./Notification");
require("./Overlay");
// Log when models are loaded
console.log('✅ All models registered');
