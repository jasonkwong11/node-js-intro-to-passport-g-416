const _ = require('lodash');
const path = require('path');
const bodyParser = require('body-parser');
const express = require('express');
const knex = require('knex');
const handlebars = require('express-handlebars');

const ENV = process.env.NODE_ENV || 'development';
const config = require('../knexfile');
const db = knex(config[ENV]);

//require Passport and other modules
//then register the passport middleware
//with our Express app

const passport = require('passport');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
// set up Local Strategy: for basic
//username/password authentication
const LocalStrategy = require('passport-local').Strategy

// Initialize Express.
const app = express();
//activate use of flash messages to pass
//messages back to client if there's an error
//during login
app.use(flash());
//activate body parser so it can read both
//JSON input and input from html forms
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
//enable app to maintain a session object
//on our requests (e.g.: req.session)
app.use(session({secret: 'our secret string'}));
//activate a parser that can read any cookies
//sent by the client browser
app.use(cookieParser());
//register the passport middleware with express:
app.use(passport.initialize()); 

// Configure handlebars templates.
app.engine('handlebars', handlebars({
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, '/views/layouts')
}));
app.set('views', path.join(__dirname, '/views'));
app.set('view engine', 'handlebars');


//custom middleware to help us determine
//whether our user is logged in or not:

//const isAuthenticated = (req, res, done) => {
//  if (req.session && req.session.passport) {
//    console.log('user is logged in: ', req.session.passport);
//    return done();
//  } 
//  res.redirect('/login');
//}

const isAuthenticated = (req, res, done) => {
  if (req.isAuthenticated()){
    return done();
  }
  res.direct('/login');
}

// Configure & Initialize Bookshelf & Knex.
console.log(`Running in environment: ${ENV}`);

// ***** Models ***** //

const Comment = require('./models/comment');
const Post = require('./models/post');
const User = require('./models/user');

//define specific validation logic for Passport

passport.use(new LocalStrategy((username, password, done) => {
  User
    .forge({ username: username })
    .fetch()
    .then((usr) => {
      if (!usr) {
        return done(null, false);
      }
      usr.validatePassword(password)
        .then((valid) => {
          if (!valid){
            return done(null, false);
          }
          return done(null, usr);
        });
    })
    .catch((err) => {
      return done(err);
    });
}));

// ***** Server ***** //

app.get('/user/:id', (req,res) => {
  User
    .forge({id: req.params.id})
    .fetch()
    .then((usr) => {
      if (_.isEmpty(usr))
        return res.sendStatus(404);
      res.send(usr);
    })
    .catch((error) => {
      console.error(error);
      return res.sendStatus(500);
    });
});

app.post('/user', (req, res) => {
  if (_.isEmpty(req.body))
    return res.sendStatus(400);
  User
    .forge(req.body)
    .save()
    .then((usr) => {
      res.send({id: usr.id});
    })
    .catch((error) => {
      console.error(error);
      return res.sendStatus(500);
    });
});

app.get('/posts', isAuthenticated, (req, res) => {
  Post
    .collection()
    .fetch()
    .then((posts) => {
      res.send(posts);
    })
    .catch((error) => {
      res.sendStatus(500);
    });
});

app.get('/post/:id', (req,res) => {
  Post
    .forge({id: req.params.id})
    .fetch({withRelated: ['author', 'comments']})
    .then((post) => {
      if (_.isEmpty(post))
        return res.sendStatus(404);
      res.send(post);
    })
    .catch((error) => {
      console.error(error);
      return res.sendStatus(500);
    });
});

app.post('/post', (req, res) => {
  if(_.isEmpty(req.body))
    return res.sendStatus(400);
  Post
    .forge(req.body)
    .save()
    .then((post) => {
      res.send({id: post.id});
    })
    .catch((error) => {
      console.error(error);
      return res.sendStatus(500);
    });
});

app.post('/comment', (req, res) => {
  if (_.isEmpty(req.body))
    return res.sendStatus(400);
  Comment
    .forge(req.body)
    .save()
    .then((comment) => {
      res.send({id: comment.id});
    })
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
});

// route for login form with handlebars
app.get('/login', (req, res) => {
  res.render('login', { message: req.flash('error') });
});

//server route where the form data on login
//form can be sent to validate the user
//here's where local strategy comes into play

app.post('/login',
  passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: true
  }),
  function(req, res){
    res.redirect('/posts');
  }
);

//serializeUser and deserializeUser:

passport.serializeUser(function(user, done){
  done(null, user.id);
  //on successful authentication, the value
  //returned by this function is stored
  // on the session. this value is set on
  // req.session.passport.user
});

passport.deserializeUser(function(user, done){
  User
    .forge({id: user})
    .fetch()
    .then((usr) => {
      done(null, usr);
    })
    .catch((err) => {
      done(err);
    })
})

// Exports for Server Hoisting.

const listen = (port) => {
  return new Promise((resolve, reject) => {
    return resolve(app.listen(port));
  });
};

exports.up = (justBackend) => {
  return db.migrate.latest([ENV])
    .then(() => {
      return db.migrate.currentVersion();
    })
    .then((val) => {
      console.log('Done running latest migration:', val);
      return listen(3000);
    })
    .then((server) => {
      console.log('Listening on port 3000...');
      return server
    });
};
