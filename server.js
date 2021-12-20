// .. other imports

const { auth } = require("express-oauth2-jwt-bearer");
//const authConfig = require("./auth_config.json");
const express = require("express");
const { join } = require("path");
const morgan = require("morgan");
const helmet = require("helmet");
const app = express();
var jwt = require('express-jwt');
const jwtAuthz = require('express-jwt-authz');
var jwks = require('jwks-rsa');


app.use(morgan("dev"));
app.use(helmet());
app.use(express.static(join(__dirname, "public")));

app.use(express.urlencoded({ extended: false }));
app.use(express.json())

// middleware
const checkJwt = jwt({
  audience: process.env.audience,
  issuerBaseURL: `https://${process.env.domain}`
});

var jwtCheck = jwt({
  secret: jwks.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: 'https://${process.env.domain}/.well-known/jwks.json'
}),
audience: 'https://${process.env.domain}/api/v2/',
issuer: 'https://${process.env.domain}/',
algorithms: ['RS256']
});


const checkScopes = jwtAuthz(['update:current_user_metadata']);


app.put("/api/external/:user_id", jwtCheck, checkScopes, async (req, res) => {
  const userId = req.params.user_id;
  
  var axios = require("axios").default;

  var options = {
    method: 'PATCH', 
    url: `https://${process.env.domain}api/v2/users/${userId}`,
    headers: { authorization: req.headers.authorization, 'content-type': 'application/json' },
    data: {
      user_metadata: { orders: req.body.orders },
    }
  };

  try {
    const response = await axios.request(options)
   
    res.send({
      msg: "Order Placed",
    });
  } catch (error) {
    console.log('Error', error);
  }
});
  

app.get("/auth_config.json", (req, res) => {
  res.sendFile(join(__dirname, "auth_config.json"));
});

app.get("/*", (_, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

process.on("SIGINT", function() {
  process.exit();
});

// ..

app.use(function(err, req, res, next) {
  if (err.name === "UnauthorizedError") {
    return res.status(401).send({ msg: "Invalid token" });
  }

  next(err, req, res);
});

//..

module.exports = app;
