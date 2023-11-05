const express = require('express');
require('dotenv').config()
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session')
const multer  = require('multer')
const PORT = process.env.PORT || 8080;

const DB =process.env.DB;
const ADMIN_ID = process.env.ADMIN_ID;
const ADMIN_PASS = process.env.ADMIN_PASS;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, 'uploads/')
   
    
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() ;
    cb(null,uniqueSuffix+file.originalname)
  }
})

const upload = multer({ storage: storage })



const app = express();

main().catch(err => console.log(err));

async function main() {
  await mongoose.connect(DB).then(()=>{
    console.log('db connected')
  }).catch((err)=>{
    console.log('db not connected '+err)
  })
  
}

const productSchema = new mongoose.Schema({
    name: {type:String , required:true},
    category: {type:String , required:true},
    price: {type:Number, required:true},
    stock:{type:Number, required:true},
    details: {type:String , required:true},
    image: {type :[String]}
    // image1: {type:String },
    // image2: {type:String },
    // image3: {type:String }
  },{timestamps:true});

  const cartSchema = new mongoose.Schema({
    items: {type:[Object], required:true},
    userId : {type:String, required:true}
    
  },{timestamps:true});

  const userSchema = new mongoose.Schema({
    userName : {type:String ,required:true},
    email : {type:String , required: true},
    profile : {type:String },
    password : {type: String,required:true}
  
  },{timestamps:true});

  const addressSchema = new mongoose.Schema({
   items: {type:[Object], required:true},
    userId : {type:String, required:true}
  });

  const ordersSchema = new mongoose.Schema({
    items: {type:[Object], required:true},
     userId : {type:String, required:true}
   },{timestamps:true});

  const Product = mongoose.model('Product', productSchema);
  const Cart = mongoose.model('Cart',cartSchema);
  const User = mongoose.model('User',userSchema);
  const Address = mongoose.model('Address',addressSchema);
  const Orders= mongoose.model('Orders',ordersSchema);


app.use(cors({
  // origin: 'http://localhost:3000',
  origin: 'https://cosmic-platypus-8127dc.netlify.app/',
  methods: ['GET','POST','DELETE'],
  credentials : true
}));
app.use(bodyParser.json({limit:'500mb',extended:true}));
app.use(bodyParser.urlencoded({limit:'500mb',extended:true, parameterLimit:100000}));
app.use(express.json({limit:'500mb',extended:true}));
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}))
app.use(express.static('uploads'))
let img='';
let imgArray = [];
let userProfile='';
app.post('/createProduct',(req,res)=>{
    let product = new Product();
    product.name= req.body.name;
    product.price=req.body.price;
    product.category=req.body.category;
    product.stock=req.body.stock;
    product.details=req.body.details;
    product.image=imgArray;
    product.save().then((success)=>{
        res.send(success)
    }).catch(err=>{
        res.send(err)
    })
   imgArray=[];
})
app.post('/photo', upload.single('image'), function (req, res, next) {
  img = req.file.filename
  res.send(img);
  imgArray.push(img);
})
app.post('/profile', upload.single('profile'), function (req, res, next) {
  userProfile = req.file.filename;
  res.send(req.file.filename);
})
app.post(`/profileName/:id`,(req,res)=>{
  User.findOne({_id:req.params.id}).then(result=>{
    result.profile = req.body.data;
    result.save().then(usr=>{
      res.send(usr);
    })
  })
})
app.post(`/profileImage/:id`,(req,res)=>{
  User.findOne({_id:req.params.id}).then(result=>{
    result.profile = "";
    result.save().then(usr=>{
      res.send(usr);
    })
  })
})

app.get('/product',(req,res)=>{
     Product.find({}).then(result=>{
        res.send(result)
     })
})

app.post(`/editProduct/:id`,(req,res)=>{
 const updatedPRoduct= Product.updateOne({_id:req.params.id},{$set:req.body}).then(result=>{
    res.send(result)
  }).catch(err=>{
    res.send(err)
  })
})

app.delete(`/deleteProduct/:id`,(req,res)=>{
  Product.findOneAndDelete({_id:req.params.id}).then(result=>{
    res.send(result)
  })
})

app.post('/cart',(req,res)=>{
  Cart.findOne({userId:req.session.user._id}).then(result=>{
    if(result){
      const itemIndex = result.items.findIndex(value=>value._id===req.body._id);
      if(itemIndex>=0){
        result.items.splice(itemIndex,1,req.body);
        result.save().then(response=>{
          res.send(response);
        })
      }else{
        result.items.push(req.body);
        result.save().then(response=>{
          res.send(response);
        })
      }
    }else{
      let cart = new Cart();
      cart.userId = req.body.userId;
      cart.items = [req.body];
      cart.save().then(response=>{
        res.send(response);
      })
    }
  })
})
app.get('/cart',(req,res)=>{
    Cart.findOne({userId:req.session.user._id}).then(result=>{
      if(result){
        res.send(result.items)
      }else{
        res.send([]);
      }
    })
})
app.delete(`/delete/:id`, (req,res)=>{
  
  // res.json(deleteDoc);
   Cart.findOne({userId:req.session.user._id}).then(result=>{
   const index= result.items.findIndex(value=>value._id===req.params.id)
   result.items.splice(index,1);
    result.save().then(cart=>{
      res.send(cart)
    })
  })
})
app.delete(`/emptyCart`, (req,res)=>{
  
  // res.json(deleteDoc);
   Cart.findOne({userId:req.session.user._id}).then(result=>{
  
   result.items=[];
    result.save().then(cart=>{
      res.send(cart)
    })
  })
})
app.post('/login', (req,res)=>{
  
  User.findOne({email:req.body.email, password:req.body.password}).then(result=>{
    if(result){
      req.session.user = result;
      res.send({status:true, user:result});
    }else{
      res.status(404).send({status:false})
    }
  })
})

app.post('/signup',(req,res)=>{
  let user = User();
  user.userName = req.body.userName;
  user.email = req.body.email;
  user.password = req.body.password;
  user.profile = "";
  User.findOne({email:req.body.email}).then(result=>{
    if(result){
      res.status(404).send({status:false});
    }else{
  user.save().then(usr=>{
    req.session.user = usr;
    res.send({status:true, user:usr});
  })
}
  })
})

app.post('/address',(req,res)=>{
  Address.findOne({userId:req.session.user._id}).then(result=>{
    if(result){
        result.items.push(req.body);
        result.save().then(response=>{
          res.send(response);
        }) 
    }else{
      let address = new Address();
      address.userId = req.body.userId;
      address.items = [req.body];
      address.save().then(response=>{
        res.send(response);
      })
    }
  })
})

app.get('/address',(req,res)=>{
  Address.findOne({userId:req.session.user._id}).then(result=>{
    if(result){
      res.send(result.items)
    }else{
      res.send({userId:req.session.user._id , items:[]})
    }
    
  })

})
app.delete(`/deleteAddress/:id`, async(req,res)=>{
    const deleteDoc = await Address.findOne({userId:req.session.user._id}).then(result=>{
   const index= result.items.findIndex(value=>value.id===req.params.id)
   result.items.splice(index,1);
    result.save().then(address=>{
      res.send(address)
    })
  })
})
app.post('/orders',(req,res)=>{
  
  Orders.findOne({userId:req.session.user._id}).then(result=>{
    if(result){
        result.items.push(req.body);
        result.save().then(response=>{
          res.send(response);
          
        }) 
    }else{
      let orders = new Orders();
      orders.userId = req.body[0].userId;
      orders.items = [req.body];
      orders.save().then(response=>{
        res.send(response);
      })
    }
  })
})

app.get('/orders',(req,res)=>{
  Orders.findOne({userId:req.session.user._id}).then(result=>{
    if(result){
      res.send(result)
     
    }else{
      res.send({userId:req.session.user._id , items:[]})
    }
    
  })

})

app.post('/adminIdPassword',(req,res)=>{
  if(req.body.adminId===ADMIN_ID && req.body.adminPassword===ADMIN_PASS){
    res.send({status:true});
  }else{
    res.send({status:false});
  }
})

app.get('/allUsersOrders',(req,res)=>{
  Orders.find({}).then(result=>{
     res.send(result)
  })

})
app.post(`/deleteOrder/:id`,(req,res)=>{
  
  Orders.findOne({userId:req.body.userId}).then(result=>{
    const index= result.items.findIndex(v=>v[v.length-1].orderId===req.params.id)
    result.items.splice(index,1);
    result.save().then(order=>{
      res.send(order)
    })
  })
})
app.post(`/orderStatus/:id`,(req,res)=>{
  Orders.findOne({userId:req.params.id}).then(result=>{
    const index= result.items.findIndex(v=>v[v.length-1].orderId===req.body.orderId)
    const order = result.items[index];
    order[order.length-1].status = req.body.selectValue;
    result.items[index].splice(order.length-1,1,order[order.length-1]);
    result.markModified('items')
    result.save().then(ordr=>{
      res.send(ordr)
    })
  })
})
app.post("/stockDetails",(req,res)=>{
  req.body.map(value=>{
    Product.findOne({_id:value.productId}).then(result=>{
      
      let newStock = result.stock - value.quantity;
      if(newStock>=0){
      result.stock = newStock;
      result.save();
    }
    })
  })
})
app.get('/user',(req,res)=>{
  if(req.session.user){
    res.send({status:true, user:req.session.user});
  }else{
    res.send({status:false})
  }
})
app.get('/allUsers',(req,res)=>{
  User.find({}).then(result=>{
    res.send(result);
  })
})
app.post(`/editUser/:id`,(req,res)=>{
  if(req.body.email){
    User.findOne({email:req.body.email}).then(reslt=>{
      if(reslt){
        res.send({status:false});
      }else{
        
        User.updateOne({_id:req.params.id},{$set:req.body}).then(result=>{
           if(result.acknowledged){
            User.find({}).then(result=>{
              res.send({status:true,result:result});
            })
           }
         }).catch(err=>{
           res.send(err)
         })
      }
    })
  }else{
    User.updateOne({_id:req.params.id},{$set:req.body}).then(result=>{
       if(result.acknowledged){
        User.find({}).then(result=>{
          res.send({status:true,result:result})
        })
       }
     }).catch(err=>{
       res.send(err)
     })
    
  }
 })
app.delete(`/deleteUser/:id`, async(req,res)=>{
  User.findOneAndDelete({_id:req.params.id}).then(result=>{
    res.send(result)
  })
})
app.delete(`/deleteUserOrder/:id`, async(req,res)=>{
  Orders.findOneAndDelete({userId:req.params.id}).then(orderResult=>{
    res.send(orderResult);
  })
})
app.delete(`/deleteUserAddress/:id`, async(req,res)=>{
  Address.findOneAndDelete({userId:req.params.id}).then(addressResult=>{
    res.send(addressResult);
  })
})
app.get('/logout',(req,res)=>{
  req.session.user = null;
  res.send({status:true})
})

app.listen(PORT,()=>{
    console.log('listen on PORT:',PORT)
})