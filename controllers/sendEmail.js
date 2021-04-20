const AWS = require("aws-sdk")
const config = require("config")

exports.emailViaAWS_SES = function (req, res, next) {
    let email = req.body.email
    const url = "http://localhost:3000/resetPassword?token=" + res.token

    AWS.config.update({
        accessKeyId: config.AWS.accessKeyId,
        secretAccessKey: config.AWS.secretAccessKey,
        region: config.AWS.region
    })

    const ses = new AWS.SES({ apiVersion: "2010-12-01" })
    const params = {
        Destination: {
            ToAddresses: [email] //Email Address/es where I want to receive reset Password URL
        },
        Message: {
            Body: {
                Html: {
                    Charset: "UTF-8",
                    Data: '<html><body>Please click on the link bellow to reset your password:<br><a href="' + url + '">' + url + '</a></body></html>'
                    //Data: "Test"
                },
                Text: {
                    Charset: "UTF-8",
                    Data: "This is the url to recover your email: URL"
                    //Data: "Test"

                }
            },
            Subject: {
                Charset: "UTF-8",
                Data: "Request to reset your password"
            }
        },
        Source: config.AWS.SenderEmailId // + config.AWS.SenderEmailId
    }

    //For Sender
    const params1 = {
        Destination: {
            ToAddresses: [config.AWS.SenderEmailId] //Email Address/es where I want to receive a Notification
        },
        Message: {
            Body: {
                Html: {
                    Charset: "UTF-8",
                    Data: "<html><body>User with email: " + email + " requested to reset password.</body></html>"
                },
                Text: {
                    Charset: "UTF-8",
                    Data: "User with email: " + email + " requested to reset password."
                }
            },
            Subject: {
                Charset: "UTF-8",
                Data: "User " + email + " requested to reset password."
            }
        },
        Source: config.AWS.SenderEmailId // + config.AWS.SenderEmailId
    }

    const sendEmailReceiver = ses.sendEmail(params).promise()
    const sendEmailSender = ses.sendEmail(params1).promise()

    sendEmailReceiver
        .then(data => {
            sendEmailSender
                .then(data => {
                    res.status(200).send({
                        message: 'Password requested successfully!'
                    })
                })
                .catch(error => {
                    res.status(404).send({
                        message: 'Failed to send to Sender!'
                    })
                })
        })
        .catch(error => {
            res.status(404).send({
                message: 'Failed to send to Receiver!'
            })
        })
}