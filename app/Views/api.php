  <div class="container"  >

  <?php 

  $rolr=$this->user->role;
$kkar=mysql_fetch_array(mysql_query("select * from permission_new where nname='".$rolr."'  "));
?>

   <h3><?=label('Sales');?> <?php if($kkar['ssa']==1){ ?><a style="float: right;" class="btn btn-primary btn-green" href="<?php echo base_url();?>"  ><?=label('AddSale');?> </a><?php } ?></h3>
   <hr>

  
    
   <!DOCTYPE html>

<html>

<head>

    <title>Angularjs PHP MySQL Pagination Example - ItSolutionStuff.com</title>

    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css" />  

    <script src="http://ajax.googleapis.com/ajax/libs/angularjs/1.5.7/angular.min.js"></script>

    <script src="dirPagination.js"></script>

</head>

<body>

   

<div class="container" ng-app="myApp" ng-controller="paginateController">

      

   <h3 align="center">Angularjs PHP MySQL Pagination Example - ItSolutionStuff.com</h3>

    

   <div class="table-responsive">

        <table class="table table-striped table-bordered">

            <thead>

                <tr>

                    <th>Id</th>

                    <th>Name</th>

                    <th>Email</th>

                </tr>

            </thead>

            <tbody>

                <tr dir-paginate="user in users|itemsPerPage:5">

                    <td>{{ user.id }}</td>

                    <td>{{ user.name }}</td>

                    <td>{{ user.email }}</td>

                </tr>

            </tbody>

        </table>

   </div>

   

   <div align="right">

        <dir-pagination-controls max-size="5" direction-links="true" boundary-links="true" >

        </dir-pagination-controls>

   </div>

   

  </div>

</body>

   

<script type="text/javascript">

     

    var myPaginateApp = angular.module('myApp', ['angularUtils.directives.dirPagination']);

   

    myPaginateApp.controller('paginateController', function($scope, $http){

        $http.get('api.php').success(function(data){

            $scope.users = data;

        });

    });

   

</script>

  

</html>