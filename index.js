const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const mysql = require('mysql');
const app = express();
const bcrypt = require("bcrypt");
const port = 3000;

//database connection
const db = mysql.createConnection({
  host: "localhost",
  user: "u737395718_root_user",
  password: "hsxKLgjExE4!",
  database: "u737395718_crochet_db",
});

// const db = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "",
//   database: "camille-crochet",
// });

//middleware
app.use(cors());
app.use(express.json());

app.get('/api/products', (req, res) => {
  const productId = req.params.id;

  const q = "SELECT * FROM products";
  db.query(q,[productId], (err,data) => {
    if (err) return res.json(err);
    return res.json(data);
  })
});

app.get('/api/products/:id', (req, res) => {
  const productId = req.params.id;

  const q = "SELECT * FROM products where id = ?";
  db.query(q,[productId], (err,data) => {
    if (err) return res.json(err);
    return res.json(data);
  })
});

app.get("/api/contactinfo" , (req, res) => {
  const q = "SELECT * FROM contactinfo";
  db.query(q, (err,data) => {
    if (err) return res.json(err);
    return res.json(data);
  })
})

app.post("/api/save-contactinfo", (req, res) => {
  const { name, email, number, subject, message } = req.body;

  const q = "INSERT INTO contactinfo (`name`, `email`, `number`, `subject`, `message`) VALUES (?, ?, ?, ?, ?)";
  const values = [name, email, number, subject, message];

  db.query(q, values, (err, data) => {
    if (err) {
      console.error("Error saving contact info:", err);
      return res.status(500).json({ error: "An error occurred while saving contact info" });
    }

    sendEmail(email, subject, message);
    return res.json("Your message has been delivered");
  });
});


//API routes
app.post("/api/registration", async (req, res) => {
  //query to validate  if the email is already registered
  const qValidate = "SELECT * FROM users  WHERE email = ?";

  //query to insert users information to user table
  const qInsert = "INSERT INTO users(`name`, `email`, `password`, `is_active`) VALUES (?,?,?, 'Y')";

  const name = req.body.name;
  const email = req.body.email;
  const password = await bcrypt.hash(req.body.password, 12);

  
  db.query(qValidate, [email], (err, data) => {
      if(err) return res.json({message: `An error occured test` + err});
  
  
      //validate if the user exist
      if(data.length > 0) {
          //if the user exist
          return res.json({message: 'The user already exists. Please use a different email address.'});
      }else{
          //if the user does not exist

          db.query(qInsert, [name, email, password], (err, data) => {
              if(err) return res.json({message: `An error occured`});

              return res.json({message: "You have succesfully registered."})
          })
      }
      // db.end();
  })
})

app.get('/api/cart/:id', (req, res) => {
  const userId = req.params.id;
  // Fetch cart items for the specified user from the database
  db.query('SELECT c.*, p.title, p.price, p.filepath FROM cart AS c JOIN products AS p ON c.product_id = p.id WHERE c.user_id = ? ', [userId], (err, result) => {
    if (err) {
      console.error("Error fetching cart items:", err);
      return res.status(500).json({ error: "An error occurred while fetching cart items" });
    }
    res.json(result);
  });
});

app.get('/api/cart/count/:id', (req, res) => {
  const userId = req.params.id; // Assuming userId is passed in the request

  // Query to get the count of items in the cart for the specified user
  const q = "SELECT COUNT(*) AS cartCount FROM cart WHERE user_id = ?";

  db.query(q, [userId], (err, result) => {
    if (err) {
      console.error("Error fetching cart count:", err);
      return res.status(500).json({ error: "An error occurred while fetching cart count" });
    }
    const cartCount = result[0].cartCount;
    res.json({ cartCount });
  });
});

app.post('/api/add-to-cart', (req, res) => {
  const { userId, productId, quantity } = req.body;

  // Check if the product is already in the cart for the user
  db.query('SELECT * FROM cart WHERE user_id = ? AND product_id = ?', [userId, productId], (err, result) => {
    if (err) {
      console.error("Error checking cart:", err);
      return res.status(500).json({ error: "An error occurred while checking the cart" });
    }

    if (result.length > 0) {
      // If the product is already in the cart, update the quantity
      const updatedQuantity = result[0].quantity + quantity;
      db.query('UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ?', [updatedQuantity, userId, productId], (err, result) => {
        if (err) {
          console.error("Error updating cart:", err);
          return res.status(500).json({ error: "An error occurred while updating the cart" });
        }
        res.json({ message: "Product quantity updated in cart" });
      });
    } else {
      // If the product is not in the cart, insert a new entry
      db.query('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)', [userId, productId, quantity], (err, result) => {
        if (err) {
          console.error("Error adding to cart:", err);
          return res.status(500).json({ error: "An error occurred while adding to cart" });
        }
        res.json({ message: "Product added to cart" });
      });
    }
  });
});

app.delete('/api/remove-from-cart/:userId/:productId', (req, res) => {
  const userId = req.params.userId;
  const productId = req.params.productId;

  db.query('DELETE FROM cart WHERE user_id = ? AND product_id = ?', [userId, productId], (err, result) => {
    if (err) {
      console.error("Error removing item from cart:", err);
      return res.status(500).json({ error: "An error occurred while removing item from cart" });
    }
    res.json({ message: "Product removed from cart" });
  });
});

function sendEmail(recepient, subject, message) {
  // Create a transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'genesis.14solsona@gmail.com',
    pass: 'camille14Rose'
  }
});

// Define email options
const mailOptions = {
  from: recepient,
  to: 'genesis.14solsona@gmail.com',
  subject: subject,
  text: message
};

// Send the email
transporter.sendMail(mailOptions, function(error, info){
  if (error) {
    console.error('Error sending email:', error);
  } else {
    console.log('Email sent:', info.response);
  }
});
}


//login api
app.post("/api/login", (req, res) => {
  const {email, password} = req.body;

  const q = "Select * FROM users  WHERE email = ?";

  //check if the user exist
  db.query(q, [email], async(err, data) => {
      if(err) {
          return res.json({message: 'An error occured'});
      }else{
          if(data.length > 0) {
              const user = data [0];

              //check if the user is active
              //if the user is active , check the password
              if(user.is_active === "Y"){
                  const match = await bcrypt.compare(password, user.password);

                  if(match) {
                      const qUpdateIncPass = "UPDATE users SET incorrect_login = ? WHERE email = ?";

                      db.query(qUpdateIncPass, [0, email], (err, data) => {
                          if(err) return res.json({message: 'An error occured'});
                          return res.json({message: 'Logged in successfully', success: true, name: user.name, id: user.id});
                      })
                  }else{
                      //update the user current incorrect login count plus 1
                      const qUpdateIncPass = "    UPDATE users SET incorrect_login = ? WHERE email = ?";

                      db.query(qUpdateIncPass, [user.incorrect_login + 1, email], (err, data) => {
                          if(err) return res.json({message: 'An error occured'});
                          return res.json({message: 'Invalid email address and/or password.', success: false});

                          //check if the user has reached 3 incorrect password
                          //if true, set is_active = N
                          if(user.incorrect_login + 1 === 3){
                              const qUpdateStat = "UPDATE users SET is_active = ? WHERE email = ?";

                              db.query(qUpdateStat, ["N", email], (err, data) => {
                                  if(err) return res.json({message: 'An error occured'});
                              })
                          }
                          return res.json({message: 'Invalid email address and/or password', success: false});
                      })
                  }

                  
              } else {
                  return res.json({message: 'Your account is blocked.', success: false})
              }
              
              //check if the password input matches the password in the database
              }else {
                  return res.json({message: 'Invalid email address and/or password', success: false});
              }
      }
  })
})


app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});