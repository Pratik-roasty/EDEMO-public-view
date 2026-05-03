const mongoose=require("mongoose");
const passportLocalMongoose=require("passport-local-mongoose");
const Poll=require("./polls")
const userSchema=new mongoose.Schema({
    username: String,
    password: String,
    name: String,
    email: String,
    participated: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: Poll.Schema
    }],
    created:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: Poll.Schema
    }]
});

userSchema.plugin(passportLocalMongoose);
const User=new mongoose.model("User",userSchema);
module.exports=User;