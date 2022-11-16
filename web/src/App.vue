<template>
  <div id="main">
  <router-view />
  </div>
</template>

<script>
export default {
  name: "App",
  data() {
    return {
      view: "main",
    };
  },
};
</script>

<style type="text/css">
	body{
		background-color: #b1e9f2;
	}
</style>