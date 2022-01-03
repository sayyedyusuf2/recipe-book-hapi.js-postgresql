const path = require("path"),
  pgp = require("pg-promise")();

const Hapi = require("@hapi/hapi");
const Inert = require("@hapi/inert");
const Vision = require("@hapi/vision");
const dotenv = require("dotenv");
dotenv.config();

let db;
const connectDB = () => {
  try {
    db = pgp(process.env.DB_URL);
  } catch (err) {
    console.error(err);
  }
};
connectDB();

const init = async () => {
  const server = Hapi.server({
    port: 3000,
    host: "localhost",
    routes: {
      files: {
        relativeTo: path.join(__dirname, "public"),
      },
    },
  });

  await server.register([Inert, Vision]);

  server.views({
    engines: {
      pug: require("pug"),
    },
    relativeTo: __dirname,
    path: "views",
  });

  server.route({
    method: "GET",
    path: "/",
    handler: async (request, h) => {
      const result = await db.query("SELECT * FROM recipes");
      return h.view("index", { recipes: result });
    },
  });

  server.route({
    method: "POST",
    path: "/add",
    handler: async (request, h) => {
      try {
        const result = await db.query(
          "INSERT INTO recipes(name, ingredients, directions) VALUES($1, $2, $3)",
          [
            request.payload.name,
            request.payload.ingredients,
            request.payload.directions,
          ]
        );
      } catch (err) {
        console.log(err);
        return h.redirect("/");
      }
      return h.redirect("/");
    },
  });

  server.route({
    method: "DELETE",
    path: "/delete/{id}",
    handler: async (request, h) => {
      try {
        const result = await db.query("DELETE FROM recipes WHERE id = $1", [
          request.params.id,
        ]);
      } catch (err) {
        console.log(err);
        h.redirect("/");
      }
      return "done";
    },
  });

  server.route({
    method: "POST",
    path: "/edit",
    handler: async (request, h) => {
      try {
        const result = await db.query(
          "UPDATE recipes SET name=$1, ingredients=$2, directions=$3 WHERE id = $4",
          [
            request.payload.name,
            request.payload.ingredients,
            request.payload.directions,
            request.payload.id,
          ]
        );
      } catch (err) {
        console.log(err);
        h.redirect("/");
      }
      return h.redirect("/");
    },
  });

  server.route({
    method: "GET",
    path: "/{param*}",
    handler: {
      directory: {
        path: ".",
        redirectToSlash: true,
      },
    },
  });

  await server.start();
  console.log("Server is running on: " + server.info.uri);
};

process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

init();
