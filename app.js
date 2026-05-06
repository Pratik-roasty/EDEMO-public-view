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


//rendering dashboard if user is authenticated, else redirecting to login page.
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

//about route
app.get("/:userRoute/about",function(req,res){
    if(req.isAuthenticated()){
        const username=req.params.userRoute;
        User.findOne({username: username},function(err,foundUser){
            if(err){
                console.log(err);            
            } else{
                if(foundUser){
                    res.render("about",{username: username,email: foundUser.email,name: foundUser.name});  
                }else{
                    res.send("User not found");
                }
            }
        })
    } else{
        res.redirect("/login");
    }
})

//create poll route
app.get("/:userRoute/create",function(req,res){
    if(req.isAuthenticated()){
        const username=req.params.userRoute;
        User.findOne({username: username},function(err,foundUser){
            if(err){
                console.log(err);            
            } else{
                if(foundUser){
                    res.render("create",{username: username,email: foundUser.email,name: foundUser.name});  
                }else{
                    res.send("User not found");
                }
            }
        })

    } else{
        res.redirect("/login")
    }
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
                nameOfCandidates: [],
                isActive: true
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
                nameOfCandidates: [],
                isActive: true
            });
            poll.save();
            res.redirect("/"+username+"/"+poll._id+"/candidates?message=OK");
        }
        
    } else{
        res.redirect("/login");
    }

});




//active polls route
app.get("/:userRoute/active",function(req,res){
    if(req.isAuthenticated()){
        const username=req.params.userRoute;
        Poll.find({isActive: true}, function(err,foundPolls){
            if(err){
                console.log(err);
            }else{
                User.findOne({username: username},function(err,foundUser){
                    if(err){
                        console.log(err);
                    } else{
                        if(foundUser){
                            res.render("active",{username: username,email: foundUser.email,name: foundUser.name,polls: foundPolls});
                        }else{
                            res.send("User not found");
                        }
                    }
                });
            }
        });

    } else{
        res.redirect("/login")
    }
});



//view poll route
app.get("/:userRoute/:poll/viewPoll",function(req,res){
    const messageEndpoll=req.query.messageEndpoll || null;
    const message=req.query.message || null;
    Poll.findOne({_id:req.params.poll},function(err,foundPoll){
        if(err){
            console.log(err);
        }
        else{
            User.findOne({username: req.params.userRoute},function(err,foundUser){
                if(err){
                    console.log(err);
                }                
                else{
                    if(foundUser){
                        res.render("viewPoll",{candidates: foundPoll.nameOfCandidates,
                        pollTitle: foundPoll.pollTitle,
                        votes: foundPoll.votes,
                        pollid: foundPoll._id,
                        voters: foundPoll.voters,
                        username: req.params.userRoute,
                        name: foundUser.name,
                        publisher: foundPoll.publisher,
                        message: message,
                        messageEndpoll: messageEndpoll,
                        endReason: foundPoll.endReason,
                        winner: foundPoll.winner,
                        isActive: foundPoll.isActive
                    });
                    }
                    else{
                        res.send("User not found");
                    }
                }
            });
        }
    })
})



//voting route

app.post("/:userRoute/:poll/vote",function(req,res){
    if(req.isAuthenticated()){
        const username=req.params.userRoute;
        const pollId=req.params.poll;
        const candidateIndex=parseInt(req.body.candidate);
        Poll.findOne({_id: pollId},function(err,foundPoll){
            if(err){
                console.log(err);
            } else{

                if(foundPoll.voters.includes(username)){
                    res.redirect("/"+username+"/"+pollId+"/viewPoll?message=You have already voted");
                }
                else{
                    foundPoll.votes[candidateIndex]++;
                    foundPoll.voters.push(username);

                    //updating the votedInPolls array of the user
                    User.findOne({username: username},function(err,foundUser){
                        if(err){
                            console.log(err);
                        } else{
                            foundUser.votedInPolls.push(pollId);
                            foundUser.save();
                        }
                    });
                    foundPoll.save();
                    res.redirect("/"+username+"/"+pollId+"/viewPoll?message=Vote cast successfully");
                }
            }
        });
    } 
    else{
        res.redirect("/login");
    }
});

//ending poll route
app.post("/:userRoute/:poll/endPoll",function(req,res){
    if(req.isAuthenticated()){
        const username=req.params.userRoute;
        const pollId=req.params.poll;
        Poll.findOne({_id: pollId},function(err,foundPoll){
            if(err){
                console.log(err);
            } else{
                if(foundPoll.publisher===username){
                    const winnerIndex=foundPoll.votes.indexOf(Math.max(...foundPoll.votes));
                    Poll.update({_id: pollId},{isActive: false, endReason: req.body.reason, winner: foundPoll.nameOfCandidates[winnerIndex]},function(err){
                        if(err){
                            console.log(err);
                        }
                    });
                    res.redirect("/"+username+"/"+pollId+"/viewPoll?messageEndpoll=End");
                } else{
                    res.redirect("/"+username+"/"+pollId+"/viewPoll?messageEndpoll=You are not the publisher of this poll");
                }
            }
        });
    } else{
        res.redirect("/login");
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
                        //find all the polls in which the user has voted and pass it to the account page
                        Poll.find({_id: {$in: foundUser.votedInPolls}},function(err,foundVotedPolls){
                            if(err){
                                console.log(err);
                            } else{
                                const userVotedPolls=foundVotedPolls;
                                res.render("account",{
                                    userVotedPolls: userVotedPolls, 
                                    user:foundUser, polls:foundPolls, 
                                    username: req.params.userRoute, 
                                    name: foundUser.name
                                });
                            }
                        })
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
        const message=req.query.message || null;
        Poll.findOne({publisher: username,_id: req.params.poll},function(err,curPoll){
            if(err){
                console.log(err);
            } else{
                User.findOne({username: username},function(err,foundUser){
                    if(err){
                        console.log(err);
                    } else{
                        if(foundUser){
                            res.render("candidates",{
                                 username:username, 
                                pollid: curPoll._id, 
                                title: curPoll.title, 
                                nameList: curPoll.nameOfCandidates, 
                                message: message,
                                name: foundUser.name
                            });
                        }else{
                            res.send("User not found");
                        }
                    }
                   
                });
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
                res.redirect("/"+req.params.userRoute+"/"+req.params.poll+"/candidates?message=User not found");
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
                                        res.redirect("/"+req.params.userRoute+"/"+req.params.poll+"/candidates?message=OK");
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


//route for closed polls
app.get("/:userRoute/closed",function(req,res){
    if(req.isAuthenticated()){
        const username=req.params.userRoute;
        Poll.find({isActive: false}, function(err,foundPolls){
            if(err){
                console.log(err);
            }else{
                User.findOne({username: username},function(err,foundUser){
                    if(err){
                        console.log(err);
                    } else{
                        if(foundUser){
                            res.render("closed",{username: username,email: foundUser.email,name: foundUser.name,polls: foundPolls});
                        }else{
                            res.send("User not found");
                        }
                    }
                });
            }
        });
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