exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.createTableIfNotExists('users', (tbl) => {
      tbl.increments('id').primary();
      tbl.string('name');
      tbl.string('username').unique();
      tbl.string('email').unique();
      tbl.timestamps();
    }),
    knex.schema.createTableIfNotExists('posts', (tbl) => {
      tbl.increments().primary();
      tbl.string('title');
      tbl.string('body');
      tbl.integer('author').references('users.id');
      tbl.timestamps();
    }),
    knex.schema.createTableIfNotExists('comments', (tbl) => {
      tbl.increments().primary();
      tbl.string('body');
      tbl.integer('user_id').references('users.id');
      tbl.integer('post_id').references('posts.id');
      tbl.timestamps();
    })
  ]);
};

exports.down = function(knex, Promise) {
  return knex.schema
    .dropTable('comments')
    .dropTable('posts')
    .dropTable('users');
};

