require("dotenv").config();
var express        = require("express"),
    app            = express(),
    bodyParser     = require("body-parser"),
    mongoose       = require("mongoose"),
    flash          = require("connect-flash"),
    passport       = require("passport"),
    LocalStrategy  = require("passport-local"),
    methodOverride = require("method-override"),
    Campground     = require("./models/campground"),
    Comment        = require("./models/comment"),
    User           = require("./models/user");

    require('dotenv').load();
    
//requring routes
var commentRoutes    = require("./routes/comments"),
    campgroundRoutes = require("./routes/campgrounds"),
    indexRoutes      = require("./routes/index")

mongoose.connect(process.env.DATABASEURL, { useNewUrlParser: true });

<<<<<<< HEAD
//fakecomment
=======
//fakecommentaaaaaassssss
>>>>>>> 9d852e087f8f3571f8540147955563b7ede814e4

app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());
app.locals.moment = require('moment');





// PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: "doncho is the best developer",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
   res.locals.currentUser = req.user;
   res.locals.error = req.flash("error");
   res.locals.success = req.flash("success");
   next();
   
});


app.use(indexRoutes);
app.use("/campgrounds", campgroundRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);

app.listen(process.env.PORT || 3000,process.env.IP, function(){
   console.log("The YelpCamp Server Has Started!");
});