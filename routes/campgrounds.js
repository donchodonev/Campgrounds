var express = require("express");
var router  = express.Router();
var Campground = require("../models/campground");
var middleware = require("../middleware");
var NodeGeocoder = require('node-geocoder');
 var options = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null
};
 
var geocoder = NodeGeocoder(options);
//multer//
var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'bulcamp', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});


//INDEX - show all campgrounds
router.get("/", function(req, res){
    var noMatch = null;
    if(req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        // Get all campgrounds from DB
        Campground.find({name: regex}, function(err, allCampgrounds){
           if(err){
               console.log(err);
           } else {
              if(allCampgrounds.length < 1) {
                  noMatch = "No campgrounds match that query, please try again.";
              }
              res.render("campgrounds/index",{campgrounds:allCampgrounds, noMatch: noMatch});
           }
        });
    } else {
        // Get all campgrounds from DB
        Campground.find({}, function(err, allCampgrounds){
           if(err){
               console.log(err);
           } else {
              res.render("campgrounds/index",{campgrounds:allCampgrounds, noMatch: noMatch});
           }
        });
    }
});


//CREATE - add new campground to DB
router.post("/", middleware.isLoggedIn, upload.single('image'), function(req, res){
  // get data from form and add to campgrounds array
  
      cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
      if(err) {
        req.flash('error', err.message);
        return res.redirect('back');
      }
      // add cloudinary url for the image to the campground object under image property
      req.body.image = result.secure_url;
      // add image's public_id to campground object
      req.body.imageId = result.public_id;

      
  var name = req.body.name;
  var price = req.body.price;
  var image = req.body.image;
  var imageId = req.body.imageId;
  var desc = req.body.description;
  var author = {
      id: req.user._id,
      username: req.user.username
  }
    geocoder.geocode(req.body.location, function (err, data) {
    if (err || !data.length) {
      req.flash('error', 'Invalid google maps location');
      return res.redirect('back');
    }
    var lat = data[0].latitude;
    var lng = data[0].longitude;
    var location = data[0].formattedAddress;
    var newCampground = {name: name,price: price, image: image,imageId:imageId, description: desc, author:author, location: location, lat: lat, lng: lng};
    // Create a new campground and save to DB
    Campground.create(newCampground, function(err, newlyCreated){
        if(err){
            console.log(err);
        } else {
            //redirect back to campgrounds page
            console.log(newlyCreated);
            res.redirect("/campgrounds");
                }
             })
        })
    })
});

//NEW - show form to create new campground
router.get("/new",middleware.isLoggedIn, function(req, res){
   res.render("campgrounds/new"); 
});

// SHOW - shows more info about one campground
router.get("/:id", function(req, res){
    //find the campground with provided ID
    Campground.findById(req.params.id).populate("comments").exec(function(err, foundCampground){
        if(err || !foundCampground){
            req.flash("error","Campground not found");
            res.redirect("back")
        } else {
            console.log(foundCampground)
            //render show template with that campground
            res.render("campgrounds/show", {campground: foundCampground});
        }
    });
});


//Edit campground route

router.get("/:id/edit",middleware.checkCampgroundOwnership,function (req, res) {
  Campground.findById(req.params.id,function (err,foundCampground){
      if (err){
          console.log(err)
      } else {
          res.render("campgrounds/edit",{campground:foundCampground});
      }
                
            }); 
    });

// UPDATE CAMPGROUND ROUTE
router.put("/:id",upload.single("image"), middleware.checkCampgroundOwnership,function(req, res){

  geocoder.geocode(req.body.location, function (err, data) {
    if (err || !data.length) {
      req.flash('error', 'Invalid google maps location');
      return res.redirect('back');
    }
    req.body.campground.lat = data[0].latitude;
    req.body.campground.lng = data[0].longitude;
    req.body.campground.location = data[0].formattedAddress;

    Campground.findById(req.params.id,async function(err, campground){
        if(err){
            req.flash("error", err.message);
            res.redirect("back");
        } else {
                 if(req.file){
                     try {
                           await cloudinary.v2.uploader.destroy(campground.imageId);
                           var result = await cloudinary.v2.uploader.upload(req.file.path);
                           campground.imageId = result.public_id;
                           campground.image = result.secure_url;
                     } catch (err){
                            req.flash("error", err.message);
                            res.redirect("back");
                     } 
                 }
                campground.name = req.body.campground.name;
                campground.description = req.body.campground.description;
                campground.price = req.body.campground.price;
                campground.lat = req.body.campground.lat;
                campground.lng = req.body.campground.lng;
                campground.location = req.body.location;
                campground.save();
                req.flash("success","Successfully Updated!");
                res.redirect("/campgrounds/" + campground._id);
            }
         });
    });
});
//Destroy route

router.delete("/:id",middleware.checkCampgroundOwnership,function (req,res){
    Campground.findById(req.params.id, async function (err,campground){
        if(err){
            req.flash("error", err.message);
            return res.redirect("back");
            }
        try {
             await cloudinary.v2.uploader.destroy(campground.imageId);
             campground.remove();
             req.flash("success","Campground deleted successfuly!")
             res.redirect("/campgrounds")
        } catch (err) {
            if(err){
            req.flash("error", err.message);
            return res.redirect("back");
            }
            
        }
    });
});

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};


module.exports = router;

