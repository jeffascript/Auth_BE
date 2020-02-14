const express = require("express");
const { check } = require("express-validator");
const Profiles = require("../models/profileSchema");
const { ObjectID } = require("mongodb");

const multer = require("multer");
const multerConfig = multer({});
const path = require("path");
const fs = require("fs-extra");


const experienceRouter = express.Router();


// GET One Profile and all its experiences
experienceRouter.get("/:username", async (req, res) => {
    try {
        const profileWithExperiences = await Profiles.aggregate([
            { $match: { username: req.params.username } },
            {
                $addFields: {
                    experiences_count: {
                        $size: "$experience"
                    }
                }
            },
            {
                $project: {
                    experiences_count: 1,
                    username: 1,
                    experience: 1,
                    _id: 0
                }
            }
        ]);

        if (profileWithExperiences.length > 0) {
            res.send({ profileExperiences: profileWithExperiences });
            //you can also return like this
            //res.send({ profileExperiences: profileWithExperiences[0] });
        } else {
            res.status(400).send("No profile found for username");
        }
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
});

// GET a Profile and One experience
experienceRouter.get("/:username/experience/:expId", async (req, res) => {
    try {
        const profileWithExperience = await Profiles.aggregate([
            { $match: { username: req.params.username } },
            {
                $unwind: "$experience"
            },

            {
                $match: { "experience._id": new ObjectID(req.params.expId) }
            },

            {
                $project: {
                    username: 1,
                    experience: 1,
                    _id: 0
                }
            }
        ]);

        if (profileWithExperience.length > 0) {
            res.send({ profileExperience: profileWithExperience });
        } else {
            res.status(404).send("No profile found for username");
        }
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
});



// POST
experienceRouter.post("/:username/newExperience", async (req, res) => {
    try {
        const newExperience = req.body;
        const addProfileExperience = await Profiles.findOneAndUpdate(
            { username: req.params.username },
            { $push: { experience: newExperience } }
        );

        if (addProfileExperience) {
            res.status(200).send({
                userName: req.params.username,
                newExperienceAdded: newExperience
            });
        } else {
            res.status(400).send({ Message: "failed to POST" });
        }
    } catch (error) {
        res.status(500).send(error);
    }
});



// - PUT https://striveschool.herokuapp.com/api/profile/userName/experiences/:expId

experienceRouter.put("/:username/:expId", async (req, res) => {
    try {
        const updateData = req.body;
        const set = {};

        for (const field in updateData) {
            set["experience.$." + field] = updateData[field];
        }
        const experienceToEdit = await Profiles.updateOne(
            {
                username: req.params.username,
                "experience._id": req.params.expId
            },
            { $set: set }
        );

        if (experienceToEdit)
            res.send({ Message: "Updated", experience: req.body });

        res.status(404).send({ message: "Not found any to update" });
    } catch (err) {
        res.status(500).send(err);
    }
});




// - DELETE https://striveschool.herokuapp.com/api/profile/userName/experiences/:expId

experienceRouter.delete("/:username/:expId", async (req, res) => {
    try {
        await Profiles.findOneAndUpdate(
            { username: req.params.username },
            { $pull: { experience: { _id: req.params.expId } } },
            err => {
                if (err) {
                    response.json(err);
                }
                res.send({ Message: "Deleted" });
            }
        );
    } catch (error) {
        res.status(500).send(error);
    }
});

//Image Post Upload
experienceRouter.post(
    "/:username/:experience/imgUpload",
    multerConfig.single("imageUrl"),
    async (req, res) => {
        try {
            const fileName =
                req.params.username + path.extname(req.file.originalname);

            const newImageLocation = path.join(
                __dirname,
                "../../images",
                fileName
            );
            await fs.writeFile(newImageLocation, req.file.buffer);

            req.body.imageUrl =
                req.protocol + "://" + req.get("host") + "/images/" + fileName;

            const newExperienceUrl = await Profiles.findOneAndUpdate(
                {
                    username: req.params.username,
                    "experience._id": req.params.experience
                },
                { $set: { "experience.$.image": req.body.imageUrl } }
            );
            if (newExperienceUrl) {
                res.status(200).send({ message: "Image URL updated" });
            } else {
                res.status(400).send({ message: "Not uploaded" });
            }
        } catch (ex) {
            res.status(500).send(ex);
        }
    }
);

module.exports = experienceRouter;
