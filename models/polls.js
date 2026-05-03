const mongoose=require("mongoose");
const User=require("./users");

const pollSchema=new mongoose.Schema({
    title: String,
    candidates: [String],
    publisher: String,
    pollID: String,
    votes: [Number],
    description: String,
    likes: Number,
    nameOfCandidates: [String]
});

const Poll=new mongoose.model("Poll",pollSchema);
module.exports=Poll;