import express from "express";
import env from "dotenv";
import bodyParser from "body-parser";
import pg from "pg";
import cors from "cors";

const app = express();

env.config();

const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});

db.connect();

app.get("/api/v1/restaurants", async (req, res) => {
    try {
        const results = await db.query("SELECT restaurants.*, reviews.count,reviews.average_rating FROM restaurants LEFT JOIN (SELECT restaurant_id, COUNT(*) AS count, TRUNC(AVG(rating), 1) AS average_rating FROM reviews GROUP BY restaurant_id) reviews ON restaurants.id = reviews.restaurant_id;")
        console.log(results.rows);
        res.status(200).json({
            status: "success",
            results: results.rows.length,
            data: {
                restaurants: results.rows,
            },
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            status: "error",
            message: "Internal Server Error",
        });
    }
});

app.get("/api/v1/restaurants/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        // Query to fetch restaurant details along with reviews count and average rating
        const restaurantQuery = `
            SELECT 
                restaurants.*, 
                reviews.count, 
                reviews.average_rating 
            FROM 
                restaurants 
            LEFT JOIN 
                (SELECT 
                    restaurant_id, 
                    COUNT(*) AS count, 
                    TRUNC(AVG(rating), 1) AS average_rating 
                 FROM 
                    reviews 
                 GROUP BY 
                    restaurant_id
                ) reviews 
            ON 
                restaurants.id = reviews.restaurant_id 
            WHERE 
                restaurants.id = $1;
        `;
        const restaurantResult = await db.query(restaurantQuery, [id]);
        // Query to fetch individual reviews for the restaurant
        const reviewsResult = await db.query("SELECT * FROM reviews WHERE restaurant_id = $1", [id]);

        res.status(200).json({
            status: "success",
            data: {
                restaurant: restaurantResult.rows[0],
                reviews: reviewsResult.rows,
            },
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            status: "error",
            message: "Internal Server Error",
        });
    }
});


app.post("/api/v1/restaurants", async (req, res) => {
    const { name, location, price_range } = req.body;

    try {
        const result = await db.query("INSERT INTO restaurants (name, location, price_range) VALUES ($1, $2, $3) RETURNING *", [name, location, price_range]);
        res.status(201).json({
            status: "success",
            data: {
                restaurant: result.rows[0],
            },
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            status: "error",
            message: "Internal Server Error",
        });
    }
});

app.put("/api/v1/restaurants/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const { name, location, price_range } = req.body;

    try {
        const result = await db.query("UPDATE restaurants SET name = $1, location = $2, price_range = $3 WHERE id = $4 RETURNING *", [name, location, price_range, id]);
        res.status(200).json({
            status: "success",
            data: {
                restaurant: result.rows[0],
            },
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            status: "error",
            message: "Internal Server Error",
        });
    }
});

app.delete("/api/v1/restaurants/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        await db.query("DELETE FROM restaurants WHERE id = $1", [id]);
        res.sendStatus(204);        
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            status: "error",
            message: "Internal Server Error",
        });
    }
});

app.post("/api/v1/restaurants/:id/addReview", async (req, res) => {
    const id = req.params.id;
    const { name, review, rating } = req.body;

    try {
        const newReview = await db.query(
            "INSERT INTO reviews (name, review, rating, restaurant_id) VALUES ($1, $2, $3, $4) returning *;",
            [name, review, rating, id]
        );
        res.status(201).json({
            status: 'success',
            data: {
                review: newReview.rows[0],
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: 'error',
            message: 'Internal Server Error'
        });
    }
});

app.listen(port, () => {
    console.log(`Server is listening on ${port}`);
});
