- The application is deployed on: http://edemo.ap-south-1.elasticbeanstalk.com
- Attached the screenshot of the pipeline that takes care of automating the deployment process. Though the process is automated, it will require manual approval by admin to commit the latest updates to the AWS resources.
<img width="1884" height="635" alt="image" src="https://github.com/user-attachments/assets/1d4aef3d-845d-40b1-8d56-5f41286bf1d7" />



-<h1>Next Version Targets</h1>
- Make backend code modular. Currently, if you will look at app.js, all the routes are embedded into same file. This structure is not the best practice when we want to plan a deployment of our application as a product. It will be difficualt to debug such files, when the features on the website increase.
- There is a plan to have more features on this application, which will enhance user experience with security.
