import { expect, haveResource } from '@aws-cdk/assert';
import autoscaling = require('@aws-cdk/aws-autoscaling');
import ec2 = require('@aws-cdk/aws-ec2');
import lbv2 = require('@aws-cdk/aws-elasticloadbalancingv2');
import cdk = require('@aws-cdk/cdk');
import { Test } from 'nodeunit';
import codedeploy = require('../lib');

// tslint:disable:object-literal-key-quotes

export = {
  'CodeDeploy Deployment Group': {
    "can be created by explicitly passing an Application"(test: Test) {
      const stack = new cdk.Stack();

      const application = new codedeploy.ServerApplication(stack, 'MyApp');
      new codedeploy.ServerDeploymentGroup(stack, 'MyDG', {
        application,
      });

      expect(stack).to(haveResource('AWS::CodeDeploy::DeploymentGroup', {
        "ApplicationName": {
          "Ref": "MyApp3CE31C26"
        },
      }));

      test.done();
    },

    'can be imported'(test: Test) {
      const stack = new cdk.Stack();

      const application = codedeploy.ServerApplicationRef.import(stack, 'MyApp', {
        applicationName: 'MyApp',
      });
      const deploymentGroup = codedeploy.ServerDeploymentGroupRef.import(stack, 'MyDG', {
        application,
        deploymentGroupName: 'MyDG',
      });

      test.notEqual(deploymentGroup, undefined);

      test.done();
    },

    "created with ASGs contains the ASG names"(test: Test) {
      const stack = new cdk.Stack();

      const asg = new autoscaling.AutoScalingGroup(stack, 'ASG', {
        instanceType: new ec2.InstanceTypePair(ec2.InstanceClass.Standard3, ec2.InstanceSize.Small),
        machineImage: new ec2.AmazonLinuxImage(),
        vpc: new ec2.VpcNetwork(stack, 'VPC'),
      });

      new codedeploy.ServerDeploymentGroup(stack, 'DeploymentGroup', {
        autoScalingGroups: [asg],
      });

      expect(stack).to(haveResource('AWS::CodeDeploy::DeploymentGroup', {
        "AutoScalingGroups": [
          {
          "Ref": "ASG46ED3070",
          },
        ]
      }));

      test.done();
    },

    "created without ASGs but adding them later contains the ASG names"(test: Test) {
      const stack = new cdk.Stack();

      const asg = new autoscaling.AutoScalingGroup(stack, 'ASG', {
        instanceType: new ec2.InstanceTypePair(ec2.InstanceClass.Standard3, ec2.InstanceSize.Small),
        machineImage: new ec2.AmazonLinuxImage(),
        vpc: new ec2.VpcNetwork(stack, 'VPC'),
      });

      const deploymentGroup = new codedeploy.ServerDeploymentGroup(stack, 'DeploymentGroup');
      deploymentGroup.addAutoScalingGroup(asg);

      expect(stack).to(haveResource('AWS::CodeDeploy::DeploymentGroup', {
        "AutoScalingGroups": [
          {
          "Ref": "ASG46ED3070",
          },
        ]
      }));

      test.done();
    },

    'can be created with an ALB Target Group as the load balancer'(test: Test) {
      const stack = new cdk.Stack();

      const alb = new lbv2.ApplicationLoadBalancer(stack, 'ALB', {
        vpc: new ec2.VpcNetwork(stack, 'VPC'),
      });
      const listener = alb.addListener('Listener', { protocol: lbv2.ApplicationProtocol.Http });
      const targetGroup = listener.addTargets('Fleet', { protocol: lbv2.ApplicationProtocol.Http });

      new codedeploy.ServerDeploymentGroup(stack, 'DeploymentGroup', {
        loadBalancer: targetGroup,
      });

      expect(stack).to(haveResource('AWS::CodeDeploy::DeploymentGroup', {
        "LoadBalancerInfo": {
          "TargetGroupInfoList": [
            {
              "Name": {
                "Fn::GetAtt": [
                  "ALBListenerFleetGroup008CEEE4",
                  "TargetGroupName",
                ],
              },
            },
          ],
        },
        "DeploymentStyle": {
          "DeploymentOption": "WITH_TRAFFIC_CONTROL",
        },
      }));

      test.done();
    },

    'can be created with an NLB Target Group as the load balancer'(test: Test) {
      const stack = new cdk.Stack();

      const nlb = new lbv2.NetworkLoadBalancer(stack, 'NLB', {
        vpc: new ec2.VpcNetwork(stack, 'VPC'),
      });
      const listener = nlb.addListener('Listener', { port: 80 });
      const targetGroup = listener.addTargets('Fleet', { port: 80 });

      new codedeploy.ServerDeploymentGroup(stack, 'DeploymentGroup', {
        loadBalancer: targetGroup,
      });

      expect(stack).to(haveResource('AWS::CodeDeploy::DeploymentGroup', {
        "LoadBalancerInfo": {
          "TargetGroupInfoList": [
            {
              "Name": {
                "Fn::GetAtt": [
                  "NLBListenerFleetGroupB882EC86",
                  "TargetGroupName",
                ],
              },
            },
          ],
        },
        "DeploymentStyle": {
          "DeploymentOption": "WITH_TRAFFIC_CONTROL",
        },
      }));

      test.done();
    },

    'can be created with a single EC2 instance tag set with a single or no value'(test: Test) {
      const stack = new cdk.Stack();

      new codedeploy.ServerDeploymentGroup(stack, 'DeploymentGroup', {
        ec2InstanceTags: new codedeploy.InstanceTagSet(
          {
            'some-key': ['some-value'],
            'other-key': [],
          },
        ),
      });

      expect(stack).to(haveResource('AWS::CodeDeploy::DeploymentGroup', {
        "Ec2TagSet": {
          "Ec2TagSetList": [
            {
              "Ec2TagGroup": [
                {
                  "Key": "some-key",
                  "Value": "some-value",
                  "Type": "KEY_AND_VALUE",
                },
                {
                  "Key": "other-key",
                  "Type": "KEY_ONLY",
                },
              ],
            },
          ],
        },
      }));

      test.done();
    },

    'can be created with two on-premise instance tag sets with multiple values or without a key'(test: Test) {
      const stack = new cdk.Stack();

      new codedeploy.ServerDeploymentGroup(stack, 'DeploymentGroup', {
        onPremiseInstanceTags: new codedeploy.InstanceTagSet(
          {
            'some-key': ['some-value', 'another-value'],
          },
          {
            '': ['keyless-value'],
          },
        ),
      });

      expect(stack).to(haveResource('AWS::CodeDeploy::DeploymentGroup', {
        "OnPremisesTagSet": {
          "OnPremisesTagSetList": [
            {
              "OnPremisesTagGroup": [
                {
                  "Key": "some-key",
                  "Value": "some-value",
                  "Type": "KEY_AND_VALUE",
                },
                {
                  "Key": "some-key",
                  "Value": "another-value",
                  "Type": "KEY_AND_VALUE",
                },
              ],
            },
            {
              "OnPremisesTagGroup": [
                {
                  "Value": "keyless-value",
                  "Type": "VALUE_ONLY",
                },
              ],
            },
          ],
        },
      }));

      test.done();
    },

    'cannot be created with an instance tag set containing a keyless, valueless filter'(test: Test) {
      const stack = new cdk.Stack();

      test.throws(() => {
        new codedeploy.ServerDeploymentGroup(stack, 'DeploymentGroup', {
          onPremiseInstanceTags: new codedeploy.InstanceTagSet({
            '': [],
          }),
        });
      });

      test.done();
    },

    'cannot be created with an instance tag set containing 4 instance tag groups'(test: Test) {
      const stack = new cdk.Stack();

      test.throws(() => {
        new codedeploy.ServerDeploymentGroup(stack, 'DeploymentGroup', {
          onPremiseInstanceTags: new codedeploy.InstanceTagSet({}, {}, {}, {}),
        });
      }, /3/);

      test.done();
    },
  },
};
