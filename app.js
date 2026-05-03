//required packages
require("dotenv").config();
const express=require("express");
const ejs=require("ejs");
const bodyParser=require("body-parser");
const mongoose=require("mongoose");
const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const User=require("./models/users");
const Poll=require("./models/polls");
//needed initialization
const app=express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
  }));
  
  app.use(passport.initialize());
  app.use(passport.session());

//database connected
mongoose.connect(process.env.URI);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//all the routes

//home route
app.get("/",function(req,res){
    res.render("index");
});
//login route
app.get("/login",function(req,res){
    res.render("login");
});
//checking credentials
app.post("/login",function(req,res){
    const user=new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user,function(err){
        if(err){
            console.log(err);
        } else{
            passport.authenticate("local",{ failureRedirect: '/login' })(req,res,function(){
                res.redirect("/"+req.body.username);
            })
        }
    })
})
//registering user route
app.get("/register",function(req,res){
    res.render("register");
});
//saving details into database.
app.post("/register",function(req,res){
    User.register({username: req.body.username,name: req.body.name,email: req.body.email},req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.redirect("/register");
        } else{
            passport.authenticate("local",{failureRedirect: '/register'})(req,res,function(){
                res.redirect("/"+req.body.username);
            })
        }
    })
});

app.get("/:userRoute",function(req,res){
    if(req.isAuthenticated()){
        const username=req.params.userRoute;
        User.findOne({username: username},function(err,foundUser){
            if(err){
                console.log(err);
            } else{
                if(foundUser){
                    res.render("dashboard",{username: username,email: foundUser.email,name: foundUser.name});
                }else{
                    res.send("User not found");
                }
            }
        })
    } else{
        res.redirect("/login");
    }
})

app.get("/:userRoute/about",function(req,res){
    if(req.isAuthenticated()){
        const username=req.params.userRoute;
        console.log(username);
        res.render("about",{username: username});
    } else{
        res.redirect("/login");
    }
})

app.get("/:userRoute/create",function(req,res){
    if(req.isAuthenticated()){
        const username=req.params.userRoute;
        res.render("create",{username: username});

    } else{
        res.redirect("/login")
    }
})
app.get("/:userRoute/active",function(req,res){
    if(req.isAuthenticated()){
        const username=req.params.userRoute;
        Poll.find({}, function(err,foundPolls){
            if(err){
                console.log(err);
            }else{
                res.render("active",{username: username,polls: foundPolls});
            }
        });

    } else{
        res.redirect("/login")
    }
});

app.get("/:userRoute/account",function(req,res){
    if(req.isAuthenticated()){
        User.findOne({username: req.params.userRoute},function(err,foundUser){
            if(err){
                console.log(err);
            }else{
                Poll.find({publisher: foundUser.username},function(err,foundPolls){
                    if(err){
                        console.log(err);
                    } else{
                        res.render("account",{user:foundUser,polls:foundPolls});
                    }
                })
            }
        })
    }
    else{
        res.redirect("/login");
    }
});

app.get("/:userRoute/:poll/candidates",function(req,res){
    if(req.isAuthenticated()){
        const username=req.params.userRoute;
        Poll.findOne({publisher: username,_id: req.params.poll},function(err,curPoll){
            if(err){
                console.log(err);
            } else{
                res.render("candidates",{user:username, pollid: curPoll._id, title: curPoll.title, nameList: curPoll.nameOfCandidates});
            }
        });
    }
    else{
        res.redirect("/login");
    }
});

app.post("/:userRoute/:poll/candidates",function(req,res){
    if(req.isAuthenticated()){
        User.findOne({username: req.body.candidate},function(err,user){
            if(err || user==null){
                res.redirect("/"+req.params.userRoute+"/"+req.params.poll+"/candidates");
            }
            else{
                const tempId=user._id;
                console.log("here: "+user.name);
                var listOfCandidates=[];
                var names=[];
                var allVotes=[];
                Poll.findOne({_id:req.params.poll},function(err,result){
                    if(err){
                        console.log(err)
                        res.redirect("/"+req.params.userRoute+"/"+req.params.poll+"/candidates")
                    }
                    else{
                        listOfCandidates=result.candidates;
                        names=result.nameOfCandidates;
                        allVotes=result.votes;
                        allVotes.push(0);
                        listOfCandidates.push(tempId);
                        User.findOne({_id: tempId},function(err,foundUser){
                            if(err){
                                console.log(err);
                            }
                            else{
                                names.push(foundUser.username);
                                Poll.update({_id:req.params.poll},{candidates:listOfCandidates, nameOfCandidates: names,votes: allVotes},function(err){
                                    if(err){
                                        console.log(err);
                                    }
                                    else{
                                        res.redirect("/"+req.params.userRoute+"/"+req.params.poll+"/candidates")
                                    }
                                });
                            }
                        })
                    }
                });
            }
        })
    }
})

app.get("/:userRoute/:poll/delete",function(req,res){
    if(req.isAuthenticated()){
        Poll.deleteOne({publisher: req.params.userRoute, _id: req.params.poll},function(err){
            if(err){
                console.log(err);
            }
            else{
                res.redirect("/"+req.params.userRoute);
            }
        })
    }
    else{
        res.redirect("/login");
    }
})


app.get("/:userRoute/:poll/viewPoll",function(req,res){
    Poll.findOne({_id:req.params.poll},function(err,foundPoll){
        if(err){
            console.log(err);
        }
        else{
            res.render("viewPoll",{candidates: foundPoll.nameOfCandidates,
                pollTitle: foundPoll.pollTitle,
                votes: foundPoll.votes,
                username: req.params.userRoute
            });
        }
    })
})

app.post("/:userRoute/create",function(req,res){
    if(req.isAuthenticated()){
        const username=req.params.userRoute;
        if(req.body.desc == "empty"){
            const poll=new Poll({
                pollID: req.body.pollID,
                title: req.body.pollTitle,
                publisher: username,
                votes: [],
                candidates: [],
                nameOfCandidates: []
            });
            poll.save();
            res.redirect("/"+username+"/"+poll._id+"/candidates");
        }
        else{
            const poll=new Poll({
                pollID: req.body.pollID,
                title: req.body.pollTitle,
                publisher: username,
                description: req.body.desc,
                votes: [],
                candidates: [],
                nameOfCandidates: []
            });
            poll.save();
            res.redirect("/"+username+"/"+poll._id+"/candidates");
        }
        
    } else{
        res.redirect("/login");
    }

});

app.post("/:userRoute/candidates",function(req,res){
    if(req.isAuthenticated()){
        const username=req.params.userRoute;
        Poll.findOne({publisher:username},function(err,poll){
            if(err){
                console.log(err);
            } else{
                poll.candidates.push(req.body.candidate);
                poll.save();
                res.redirect("/"+username+"/candidates");
            }
        })
    }
    else{
        res.redirect("/login");
    }
})

app.get("/:userRoute/logout",function(req,res){
    console.log(req.params.userRoute+" out");
    req.logout();
    res.redirect("/");
})

const port = process.env.PORT || 3000;
	app.listen(port,function(){
		console.log("server started at" + port);
	});