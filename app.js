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

app.use(express.json());

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


//checking credentials
app.post("/login",function(req,res){
    const user=new User({
        username: req.body.username,
        password: req.body.password
    });

    console.log("here: "+req.body.username);

    req.login(user,function(err){
        if(err){
            console.log(err);
            res.render("index", {loginError: "Invalid username or password. Please try again."});
        } else{
            passport.authenticate("local",{ failureRedirect: '/' })(req,res,function(){
                res.redirect("/"+req.body.username);
            })
        }
    })
})


//saving details into database.
app.post("/register",function(req,res){
    User.register({username: req.body.username,name: req.body.name,email: req.body.email},req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.render("index", {registerError: "Username already exists. Please choose a different username."});
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
                    //find all the active polls in the database and pass it to the dashboard page
                    Poll.find({isActive: true}, function(err, activePolls) {
                        if(err) {
                            console.log(err);
                        } else {
                            Poll.find({isActive: false}, function(err, closedPolls) {
                                if(err) {
                                    console.log(err);
                                } else {
                                    //find sum of votes received by all polls created by the user and pass it to the dashboard page as totalVotesReceived
                                    Poll.find({publisher: username}, function(err, userPolls) {
                                        if(err) {
                                            console.log(err);
                                        }
                                        else {                                            
                                            const totalVotesReceived = userPolls.reduce((total, poll) => total + poll.votes.reduce((a, b) => a + b, 0), 0);
                                            console.log("Total votes received: " + totalVotesReceived);
                                            const globalPolls= activePolls.length + closedPolls.length;
                                        
                                            res.render("dashboard",{
                                                user: foundUser,
                                                username: username,
                                                email: foundUser.email,
                                                name: foundUser.name,
                                                activePolls: activePolls,
                                                closedPolls: closedPolls,
                                                userTotalPolls: foundUser.created.length,
                                                totalVotesReceived: totalVotesReceived,
                                                globalPolls: globalPolls
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                } else{
                    res.send("User not found");
                }
            }
        })
    } else{
        res.redirect("/");
    }
});


//dashboards post the create request on this route. It creates and saves a new poll and redirects to the add candidates page of that poll.

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
        res.redirect("/");
    }

});


//add candidates page rendering route.

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
        res.redirect("/");
    }
});


//post request to add candidates to the poll. It checks if the candidates are registered users. If yes, it adds them to the poll and initializes their votes to 0. If not, it redirects back to the candidates page with an error message.
app.post("/:userRoute/:poll/candidates",function(req,res){
    if(req.isAuthenticated()){
        //the candidates are sent as an array in the request body
        const candidates=req.body.candidates;
        const username=req.params.userRoute;
        console.log("Here in post request: " + candidates);

        //check if the candidate in candidates array is a part of user database. If not, send an error message to the candidates page.
        User.find({username: {$in: candidates}},function(err,foundUsers){
            if(err){
                console.log(err);
            } else{
                if(foundUsers.length!==candidates.length){
                    res.json({
                        redirect: "/"+username+"/"+req.params.poll+"/candidates",
                        message: "One or more candidates are not registered users"
                    });
                }
                else{
                    Poll.findOne({_id: req.params.poll},function(err,foundPoll){
                        if(err){
                            console.log(err);
                        } else{
                            foundPoll.candidates=candidates;
                            foundPoll.nameOfCandidates=candidates.map(candidate => {
                                const user=foundUsers.find(user => user.username === candidate);
                                return user ? user.name : candidate;
                            });
                            foundPoll.votes=new Array(candidates.length).fill(0);
                            foundPoll.save();
                            //redirect to view poll page of the poll
                            User.findOne({username: username},function(err,foundUser){
                                if(err){
                                    console.log(err);
                                } else{
                                    if(foundUser){
                                        console.log("redirecting to view poll page");
                                        foundUser.created.push(foundPoll._id);
                                        foundUser.save();
                                        res.json({
                                            redirect: "/"+username+"/"+req.params.poll+"/viewPoll",
                                            message: "Candidates added successfully, redirecring to view poll page...."
                                        });
                                    }
                                    else{
                                        res.send("User not found");
                                    }
                                }
                            });
                        }
                    });
                }
            }
        });
    }
    else{
        res.redirect("/");
    }
})





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
        res.redirect("/")
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
                        res.render("viewPoll",{
                        candidates: foundPoll.nameOfCandidates,
                        userCandidates: foundPoll.candidates,
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
        res.redirect("/");
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
        res.redirect("/");
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
                                    user:foundUser, 
                                    polls:foundPolls, 
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
        res.redirect("/");
    }
});


app.get("/:userRoute/profile/:candidate",function(req,res){
    if(req.isAuthenticated()){
        User.findOne({username: req.params.candidate},function(err,foundUser){
            if(err){
                console.log(err);
            } else{
                if(foundUser){
                    //find polls created by the candidate and polls in which the candidate has voted
                    Poll.find({publisher: foundUser.username},function(err,createdPolls){
                        if(err){
                            console.log(err);
                        } else{
                            Poll.find({_id: {$in: foundUser.votedInPolls}},function(err,votedPolls){
                                if(err){
                                    console.log(err);
                                } else{
                                    res.render("account",{
                                        user: foundUser,
                                        polls: createdPolls,
                                        userVotedPolls: votedPolls,
                                        username: req.params.userRoute,
                                        name: foundUser.name,
                                        email: foundUser.email
                                    });
                                }
                            })
                        }
                    })
                }
                else{
                    res.send("User not found");
                }
            }
        })
    }
    else{
        res.redirect("/");
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
        res.redirect("/");
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
        res.redirect("/");
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
        res.redirect("/");
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