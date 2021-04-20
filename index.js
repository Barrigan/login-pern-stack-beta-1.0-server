const express = require("express")
const app = express()
const cors = require('cors')
const pool = require('./db')

console.log("Loading server...")

const bcrypt = require('bcryptjs')

const send = require('./controllers/sendEmail')

//middleware
app.use(cors())
app.use(express.json())

//ROUTES//

//Register a New School User
app.post("/DSUser/register", async (req, res) => {
    try {
        const newDSUser = await pool.query("INSERT INTO dsusers (dsuser_uid, first_name, last_name, email, password) VALUES (uuid_generate_v4(), $1, $2, $3, $4) RETURNING dsuser_uid, first_name, last_name, email", [req.body.fname, req.body.lname, req.body.email, req.body.password])
        res.json(newDSUser)
    } catch (err) {
        if (err.message == 'duplicate key value violates unique constraint "unique_email"') {
            res.json({ error: "duplicated email" })
        } else {
            res.json({ error: err.message })
        }
    }
})

//Request a School User LOGIN
app.post("/DSUser/login", async (req, res) => {
    try {
        let email = req.body.email
        let password = req.body.password
        const loginDSUser = await pool.query("SELECT dsuser_uid, first_name, password FROM dsusers WHERE email = $1", [email])

        bcrypt.compare(password, loginDSUser.rows[0].password, function (err, result) {
            if (err) {
                res.error(err.message)
            }
            if (result) {
                res.json({
                    dsuser_uid: loginDSUser.rows[0].dsuser_uid,
                    first_name: loginDSUser.rows[0].first_name
                })
            }
            else {
                res.json({ error: "invalid password or user" })
            }
        })
    } catch (err) {
        res.json({ error: err.message })
    }
})

//Request a New Password
app.post("/DSUser/requestPwd", async (req, res) => {
    try {
        let result = await pool.query("SELECT * FROM dsusers WHERE email = $1", [req.body.email])
        if (result.rowCount === 0) {
            res.json({
                error: "non-existent user"
            })
        } else {
            let result2 = await pool.query("INSERT INTO recoverPwd (token, email, requested, dsuser_uid, used) SELECT uuid_generate_v4(), $1, NOW(), dsuser_uid, FALSE FROM dsusers WHERE email = $2 RETURNING token", [req.body.email, req.body.email])
            res.token = result2.rows[0].token
            send.emailViaAWS_SES(req, res)

        }
    } catch (err) {
        res.json({ error: err.message })
    }
})
//Reset Password
app.post("/DSUser/resetPwd", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM recoverpwd WHERE token = $1 AND used = false;", [req.body.token])
        if (result.rows && result.rows[0] && result.rows[0].requested) {
            let requested = new Date(result.rows[0].requested)
            let requestedInMilliseconds = requested.valueOf()
            let currentTime = new Date().valueOf()
            let difference = currentTime - requestedInMilliseconds

            if (difference >= 900000) {
                res.json({
                    tokenStatus: "Token expired"
                })
            } else {
                let password = req.body.password
                const result2 = await pool.query("UPDATE dsusers SET password = $1 WHERE dsuser_uid = $2 RETURNING dsuser_uid;", [req.body.password, result.rows[0].dsuser_uid])
                let result3;
                if (result2 && result2.rowCount && result2.rowCount == 1) {
                    result3 = await pool.query("UPDATE recoverpwd SET used = true WHERE token = $1;", [req.body.token])
                    res.json({
                        message: "Password updated succesfully"
                    })
                } else {
                    res.json({
                        error: "It was not possible to update the password. Please try later."
                    })
                }
            }
        } else {
            res.json({
                tokenStatus: "Token Used"
            })
        }
    } catch (err) {
        res.json({
            error: err.message
        })
    }
})


//Update a School User
app.put("/DSUser", async (req, res) => {
    try {
        let uid = req.body.uid
        let firstName = req.body.fname
        let lastName = req.body.lname
        let email = req.body.email
        const updateDSUser = await pool.query("UPDATE dsusers SET email = $1, first_name = $2,  last_name = $3 WHERE dsuser_uid = $4", [email, firstName, lastName, uid])
        if (updateDSUser.rowCount && updateDSUser.rowCount == 1) {
            res.json("DSUser Updated!")
        }
        res.json("DSUser wasn't updated")
    } catch (err) {
        res.json({ error: err.message })
    }
})

//Delete a DSUser
app.delete("/DSUser", async (req, res) => {
    try {
        let uid = req.body.uid
        const deleteUser = await pool.query("DELETE FROM dsusers WHERE dsuser_uid = $1", [uid])
        if (deleteUser.rowCount && deleteUser.rowCount == 1) {
            res.json("DSUser Deleted!")
        }
        res.json("DSUser wasn't deleted")
    } catch (err) {
        res.json({ error: err.message })
    }
})

app.listen(5000, () => {
    console.log("server has started on port 5000")
})