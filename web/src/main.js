import App from "./App.vue";
import Vue from "vue";
import VueRouter from "vue-router";
import MainPage from "./pages/MainPage.vue";
import Campaign from "./pages/Campaign.vue";

Vue.use(VueRouter);
const router = new VueRouter({
  mode: "history",
  routes: [
    { name: "main", component: MainPage, path: "/", children: [] },
    { name: "home", component: Campaign, path: "/home/:address", children: [] }
  ]
});

new Vue({
  router,
  render: (h) => h(App)
}).$mount("#app");
